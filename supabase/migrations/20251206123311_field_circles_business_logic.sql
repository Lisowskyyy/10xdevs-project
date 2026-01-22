-- Migration: Field Circles Business Logic
-- Purpose: Add constraints, location fields, status management, and RLS policies
-- Affected tables: field_circles, circle_rsvps, meditation_logs, profiles
-- 
-- This migration:
-- 1. Adds unique constraints to prevent duplicate RSVPs and meditation logs
-- 2. Adds location sharing fields to profiles table
-- 3. Ensures status field exists in field_circles
-- 4. Creates RLS policies for all tables
-- 5. Adds indexes for performance

-- ============================================================================
-- 1. ENSURE PROFILES TABLE HAS LOCATION FIELDS
-- ============================================================================

-- Add location fields to profiles if they don't exist
-- Note: This assumes profiles table exists. If it doesn't, create it first.
do $$
begin
  -- Add location_lat if missing
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'location_lat'
  ) then
    alter table profiles add column location_lat double precision;
  end if;

  -- Add location_lon if missing
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'location_lon'
  ) then
    alter table profiles add column location_lon double precision;
  end if;

  -- Add location_share_enabled if missing
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'location_share_enabled'
  ) then
    alter table profiles add column location_share_enabled boolean default false;
  end if;
end $$;

-- ============================================================================
-- 2. ENSURE FIELD_CIRCLES HAS STATUS FIELD
-- ============================================================================

-- Add status field if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'field_circles' and column_name = 'status'
  ) then
    alter table field_circles add column status text default 'active' check (status in ('active', 'archived', 'cancelled'));
  end if;
end $$;

-- ============================================================================
-- 3. ADD UNIQUE CONSTRAINTS TO PREVENT DUPLICATES
-- ============================================================================

-- Remove duplicate RSVPs before adding constraint (keep the latest one with status 'joined' if available)
-- This is a cleanup step that should be run before the constraint
do $$
declare
  dup_count integer;
begin
  -- Count duplicates
  select count(*) into dup_count
  from (
    select user_id, circle_id, count(*) as cnt
    from circle_rsvps
    group by user_id, circle_id
    having count(*) > 1
  ) dups;

  if dup_count > 0 then
    -- Delete duplicates, keeping the one with status 'joined' or the latest created_at
    delete from circle_rsvps
    where id in (
      select id from (
        select id,
          row_number() over (
            partition by user_id, circle_id 
            order by 
              case when status = 'joined' then 0 else 1 end,
              created_at desc
          ) as rn
        from circle_rsvps
      ) ranked
      where rn > 1
    );
  end if;
end $$;

-- Add unique constraint on circle_rsvps (user_id, circle_id)
-- This prevents duplicate RSVPs
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'circle_rsvps_user_circle_unique'
  ) then
    alter table circle_rsvps 
    add constraint circle_rsvps_user_circle_unique 
    unique (user_id, circle_id);
  end if;
end $$;

-- Remove duplicate meditation logs before adding constraint
do $$
declare
  dup_count integer;
begin
  select count(*) into dup_count
  from (
    select user_id, circle_id, count(*) as cnt
    from meditation_logs
    group by user_id, circle_id
    having count(*) > 1
  ) dups;

  if dup_count > 0 then
    -- Keep the earliest log (first completion)
    delete from meditation_logs
    where id in (
      select id from (
        select id,
          row_number() over (
            partition by user_id, circle_id 
            order by created_at asc
          ) as rn
        from meditation_logs
      ) ranked
      where rn > 1
    );
  end if;
end $$;

-- Add unique constraint on meditation_logs (user_id, circle_id)
-- This prevents duplicate meditation log entries per user per circle
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'meditation_logs_user_circle_unique'
  ) then
    alter table meditation_logs 
    add constraint meditation_logs_user_circle_unique 
    unique (user_id, circle_id);
  end if;
end $$;

-- ============================================================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering circles by status
create index if not exists idx_field_circles_status 
on field_circles(status) 
where status = 'active';

-- Index for filtering by scheduled_at (for archiving logic)
create index if not exists idx_field_circles_scheduled_at 
on field_circles(scheduled_at);

-- Index for profiles location sharing
create index if not exists idx_profiles_location_share 
on profiles(location_share_enabled) 
where location_share_enabled = true;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
alter table field_circles enable row level security;
alter table circle_rsvps enable row level security;
alter table meditation_logs enable row level security;
alter table profiles enable row level security;

-- ============================================================================
-- FIELD_CIRCLES POLICIES
-- ============================================================================

-- Anyone can read active circles
drop policy if exists field_circles_select_anon on field_circles;
create policy field_circles_select_anon on field_circles
  for select
  to anon
  using (status = 'active');

-- Authenticated users can read all circles (including archived for history)
drop policy if exists field_circles_select_authenticated on field_circles;
create policy field_circles_select_authenticated on field_circles
  for select
  to authenticated
  using (true);

-- Only authenticated users can create circles
drop policy if exists field_circles_insert_authenticated on field_circles;
create policy field_circles_insert_authenticated on field_circles
  for insert
  to authenticated
  with check (auth.uid() = creator_id);

-- Only circle creator can update their circle
drop policy if exists field_circles_update_authenticated on field_circles;
create policy field_circles_update_authenticated on field_circles
  for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- Only circle creator can delete their circle
drop policy if exists field_circles_delete_authenticated on field_circles;
create policy field_circles_delete_authenticated on field_circles
  for delete
  to authenticated
  using (auth.uid() = creator_id);

-- ============================================================================
-- CIRCLE_RSVPS POLICIES
-- ============================================================================

-- Authenticated users can read RSVPs for circles they can see
drop policy if exists circle_rsvps_select_authenticated on circle_rsvps;
create policy circle_rsvps_select_authenticated on circle_rsvps
  for select
  to authenticated
  using (
    exists (
      select 1 from field_circles 
      where field_circles.id = circle_rsvps.circle_id
    )
  );

-- Users can only insert/update their own RSVPs
drop policy if exists circle_rsvps_insert_authenticated on circle_rsvps;
create policy circle_rsvps_insert_authenticated on circle_rsvps
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists circle_rsvps_update_authenticated on circle_rsvps;
create policy circle_rsvps_update_authenticated on circle_rsvps
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own RSVPs
drop policy if exists circle_rsvps_delete_authenticated on circle_rsvps;
create policy circle_rsvps_delete_authenticated on circle_rsvps
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- MEDITATION_LOGS POLICIES
-- ============================================================================

-- Users can only read their own meditation logs
drop policy if exists meditation_logs_select_authenticated on meditation_logs;
create policy meditation_logs_select_authenticated on meditation_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can only insert their own meditation logs
drop policy if exists meditation_logs_insert_authenticated on meditation_logs;
create policy meditation_logs_insert_authenticated on meditation_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own meditation logs
drop policy if exists meditation_logs_update_authenticated on meditation_logs;
create policy meditation_logs_update_authenticated on meditation_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own meditation logs
drop policy if exists meditation_logs_delete_authenticated on meditation_logs;
create policy meditation_logs_delete_authenticated on meditation_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
drop policy if exists profiles_select_authenticated on profiles;
create policy profiles_select_authenticated on profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Public read of location data only if location_share_enabled = true
-- This allows the globe to show markers for users who opted in
drop policy if exists profiles_select_location_shared on profiles;
create policy profiles_select_location_shared on profiles
  for select
  to authenticated
  using (
    location_share_enabled = true 
    and location_lat is not null 
    and location_lon is not null
  );

-- Users can insert their own profile
drop policy if exists profiles_insert_authenticated on profiles;
create policy profiles_insert_authenticated on profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can update their own profile
drop policy if exists profiles_update_authenticated on profiles;
create policy profiles_update_authenticated on profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

