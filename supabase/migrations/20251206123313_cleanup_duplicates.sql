-- Migration: Cleanup Duplicates Script
-- Purpose: Standalone script to clean up any existing duplicates
-- 
-- This script can be run manually to clean up duplicates that may exist
-- before the unique constraints were added.
-- 
-- Run this AFTER the main migration if you need to clean up existing data.

-- ============================================================================
-- CLEANUP DUPLICATE RSVPS
-- ============================================================================

-- Remove duplicate RSVPs, keeping:
-- 1. The one with status 'joined' if available
-- 2. Otherwise, the most recent one (by created_at)
do $$
declare
  deleted_count integer;
begin
  with ranked_rsvps as (
    select 
      id,
      row_number() over (
        partition by user_id, circle_id 
        order by 
          case when status = 'joined' then 0 else 1 end,
          created_at desc
      ) as rn
    from circle_rsvps
  )
  delete from circle_rsvps
  where id in (
    select id from ranked_rsvps where rn > 1
  );
  
  get diagnostics deleted_count = row_count;
  
  raise notice 'Deleted % duplicate RSVP entries', deleted_count;
end $$;

-- ============================================================================
-- CLEANUP DUPLICATE MEDITATION LOGS
-- ============================================================================

-- Remove duplicate meditation logs, keeping the earliest one (first completion)
do $$
declare
  deleted_count integer;
begin
  with ranked_logs as (
    select 
      id,
      row_number() over (
        partition by user_id, circle_id 
        order by created_at asc
      ) as rn
    from meditation_logs
  )
  delete from meditation_logs
  where id in (
    select id from ranked_logs where rn > 1
  );
  
  get diagnostics deleted_count = row_count;
  
  raise notice 'Deleted % duplicate meditation log entries', deleted_count;
end $$;

-- ============================================================================
-- VERIFICATION QUERIES (run these to check for remaining duplicates)
-- ============================================================================

-- Check for remaining duplicate RSVPs
-- select user_id, circle_id, count(*) as cnt
-- from circle_rsvps
-- group by user_id, circle_id
-- having count(*) > 1;

-- Check for remaining duplicate meditation logs
-- select user_id, circle_id, count(*) as cnt
-- from meditation_logs
-- group by user_id, circle_id
-- having count(*) > 1;

