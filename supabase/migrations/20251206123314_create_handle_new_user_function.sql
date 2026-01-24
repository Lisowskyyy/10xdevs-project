-- Migration: Create handle_new_user function and trigger
-- Purpose: Automatically create profile records for new users and extract first/last name from auth metadata
-- Date: 2025-01-24

-- ============================================================================
-- FUNCTION: handle_new_user()
-- ============================================================================

-- Create the function that handles new user registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  full_name text;
  first_name text;
  last_name text;
  name_parts text[];
begin
  -- Extract full name from user metadata
  -- Try different possible field names for full name
  full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name',
    ''
  );

  -- Split full name into parts (assuming format: "First Last" or "First Middle Last")
  if full_name != '' then
    -- Split by spaces and take first and last parts
    name_parts := string_to_array(trim(full_name), ' ');

    -- Extract first name (first part)
    if array_length(name_parts, 1) >= 1 then
      first_name := trim(name_parts[1]);
    end if;

    -- Extract last name (last part, or second part if only two parts)
    if array_length(name_parts, 1) >= 2 then
      last_name := trim(name_parts[array_length(name_parts, 1)]);
    end if;
  end if;

  -- Insert new profile record with exception handling
  -- This prevents registration failures if profile creation fails
  begin
    insert into public.profiles (
      id,
      imie,
      nazwisko,
      created_at,
      updated_at
    )
    values (
      new.id,
      first_name,
      last_name,
      now(),
      now()
    );

    -- Log successful creation
    raise log 'Created profile for user %: first_name=%, last_name=%, full_name=%',
      new.id, first_name, last_name, full_name;

  exception when others then
    -- Log the error but DON'T block user registration
    raise warning 'Error creating profile for user %: % (SQLSTATE: %)',
      new.id, sqlerrm, sqlstate;
    raise log 'Profile creation failed for user %, but user registration will continue',
      new.id;
  end;

  return new;
end;
$$;

-- ============================================================================
-- TRIGGER: on_auth_user_created
-- ============================================================================

-- Drop the trigger if it exists (to avoid errors on re-run)
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger that fires after insert on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_user() to anon;

-- ============================================================================
-- BACKFILL EXISTING USERS (optional)
-- ============================================================================

-- For existing users who don't have profiles yet, create basic profiles
-- This is optional and can be removed if not needed
do $$
declare
  user_record record;
  full_name text;
  first_name text;
  last_name text;
  name_parts text[];
begin
  -- Loop through users who don't have profiles
  for user_record in
    select au.id, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on au.id = p.id
    where p.id is null
  loop
    -- Extract name using same logic as the function
    full_name := coalesce(
      user_record.raw_user_meta_data->>'full_name',
      user_record.raw_user_meta_data->>'name',
      user_record.raw_user_meta_data->>'display_name',
      ''
    );

    -- Split and extract names
    if full_name != '' then
      name_parts := string_to_array(trim(full_name), ' ');
      if array_length(name_parts, 1) >= 1 then
        first_name := trim(name_parts[1]);
      end if;
      if array_length(name_parts, 1) >= 2 then
        last_name := trim(name_parts[array_length(name_parts, 1)]);
      end if;
    end if;

    -- Insert profile for existing user with exception handling
    begin
      insert into public.profiles (
        id,
        imie,
        nazwisko,
        created_at,
        updated_at
      )
      values (
        user_record.id,
        first_name,
        last_name,
        now(),
        now()
      );

      raise log 'Backfilled profile for existing user %: first_name=%, last_name=%',
        user_record.id, first_name, last_name;

    exception when others then
      -- Log the error but continue processing other users
      raise warning 'Error backfilling profile for existing user %: % (SQLSTATE: %)',
        user_record.id, sqlerrm, sqlstate;
    end;
  end loop;
end;
$$;