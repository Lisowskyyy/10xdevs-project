-- Migration: Archive Expired Circles Function
-- Purpose: Create a function to automatically archive circles after their session ends
-- 
-- This function can be called:
-- 1. Via a Supabase cron job (pg_cron extension)
-- 2. Via an API endpoint that calls this function
-- 3. Manually via SQL

-- ============================================================================
-- FUNCTION: ARCHIVE EXPIRED CIRCLES
-- ============================================================================

-- Function to archive circles that have ended (scheduled_at + duration_minutes < now)
create or replace function archive_expired_circles()
returns integer
language plpgsql
security definer
as $$
declare
  archived_count integer;
begin
  -- Update circles to 'archived' status where:
  -- 1. Status is currently 'active'
  -- 2. scheduled_at + duration_minutes is in the past
  update field_circles
  set status = 'archived'
  where status = 'active'
    and (scheduled_at + (duration_minutes || ' minutes')::interval) < now();
  
  get diagnostics archived_count = row_count;
  
  return archived_count;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function archive_expired_circles() to authenticated;
grant execute on function archive_expired_circles() to anon;

-- ============================================================================
-- OPTIONAL: SET UP PG_CRON JOB (requires pg_cron extension)
-- ============================================================================

-- Uncomment the following if you have pg_cron extension enabled:
-- This will run the archiving function every hour
-- 
-- select cron.schedule(
--   'archive-expired-circles',
--   '0 * * * *', -- Every hour at minute 0
--   $$select archive_expired_circles();$$
-- );

-- ============================================================================
-- ALTERNATIVE: TRIGGER-BASED APPROACH (optional)
-- ============================================================================

-- If you prefer triggers, you could create a trigger that checks on insert/update
-- However, a scheduled function is more reliable for time-based archiving

