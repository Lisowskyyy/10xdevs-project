# Field Circles Business Logic Implementation Summary

This document summarizes all the changes made to implement the meditation field circles business logic with data integrity, deduplication, archiving, and user location privacy.

## 📋 Overview

All requirements have been implemented:
1. ✅ Prevent duplicate RSVPs
2. ✅ Archive circles after session ends
3. ✅ Track completed meditation sessions
4. ✅ Location sharing consent
5. ✅ Globe markers only for consenting users
6. ✅ Row Level Security (RLS) policies
7. ✅ SQL migrations and cleanup scripts

## 📁 Files Created

### SQL Migrations

1. **`supabase/migrations/20251206123311_field_circles_business_logic.sql`**
   - Adds unique constraints on `circle_rsvps` (user_id, circle_id)
   - Adds unique constraints on `meditation_logs` (user_id, circle_id)
   - Adds location fields to `profiles` table (location_lat, location_lon, location_share_enabled)
   - Ensures `status` field exists in `field_circles`
   - Creates indexes for performance
   - Implements comprehensive RLS policies for all tables

2. **`supabase/migrations/20251206123312_archive_circles_function.sql`**
   - Creates `archive_expired_circles()` function
   - Can be called via cron job or API endpoint
   - Archives circles where `scheduled_at + duration_minutes < now()`

3. **`supabase/migrations/20251206123313_cleanup_duplicates.sql`**
   - Standalone cleanup script for existing duplicates
   - Removes duplicate RSVPs (keeps latest with status 'joined')
   - Removes duplicate meditation logs (keeps earliest)

### Components

4. **`src/components/LocationConsentModal.tsx`**
   - React component for location sharing consent
   - Requests browser geolocation if user consents
   - Updates profile with location and consent flag
   - Only shows if user hasn't made a decision yet

### API Endpoints

5. **`src/pages/api/circles/archive.ts`**
   - API endpoint to trigger circle archiving
   - Can be called via POST or GET
   - Optional API key protection
   - Returns count of archived circles

## 📝 Files Modified

### Pages

1. **`src/pages/field-circles.astro`**
   - ✅ Filters circles by status (active/archived)
   - ✅ Adds view toggle for active/archived circles
   - ✅ Shows archive badge for archived circles

2. **`src/pages/circles/create.astro`**
   - ✅ Already sets status to "active" (no changes needed)

3. **`src/pages/circles/[id].astro`**
   - ✅ Fixed RSVP upsert with conflict target `(user_id, circle_id)`
   - ✅ Fixed meditation logs to use upsert instead of insert
   - ✅ Updated globe markers to only show users who:
     - Have joined the circle (RSVP)
     - Have `location_share_enabled = true`
     - Have valid coordinates (location_lat, location_lon)
   - ✅ Removed random fallback coordinates
   - ✅ Added LocationConsentModal component

4. **`src/pages/profile.astro`**
   - ✅ Fixed table reference from `circle_participants` to `circle_rsvps`
   - ✅ Added meditation sessions section
   - ✅ Shows completed meditation sessions with circle details
   - ✅ Added stat card for total completed sessions

## 🔒 Security (RLS Policies)

### field_circles
- **Select (anon)**: Can read active circles only
- **Select (authenticated)**: Can read all circles
- **Insert**: Only authenticated users, must be creator
- **Update/Delete**: Only creator can modify

### circle_rsvps
- **Select**: Authenticated users can read RSVPs for visible circles
- **Insert/Update/Delete**: Users can only modify their own RSVPs

### meditation_logs
- **Select/Insert/Update/Delete**: Users can only access their own logs

### profiles
- **Select (own)**: Users can read their own profile
- **Select (location shared)**: Authenticated users can read location data only if `location_share_enabled = true`
- **Insert/Update**: Users can only modify their own profile

## 🗄️ Database Schema Changes

### New/Updated Columns

**profiles table:**
- `location_lat` (double precision) - User's latitude
- `location_lon` (double precision) - User's longitude  
- `location_share_enabled` (boolean, default false) - Consent flag

**field_circles table:**
- `status` (text, check: 'active'|'archived'|'cancelled') - Circle status

### Constraints Added

- `circle_rsvps_user_circle_unique` - Unique (user_id, circle_id)
- `meditation_logs_user_circle_unique` - Unique (user_id, circle_id)

### Indexes Added

- `idx_field_circles_status` - For filtering by status
- `idx_field_circles_scheduled_at` - For archiving logic
- `idx_profiles_location_share` - For location sharing queries

## 🚀 Usage

### Running Migrations

```bash
# Apply migrations via Supabase CLI
supabase db push

# Or apply manually in Supabase dashboard SQL editor
```

### Setting Up Archiving

**Option 1: Supabase Cron (pg_cron)**
```sql
-- Uncomment in migration file 20251206123312_archive_circles_function.sql
select cron.schedule(
  'archive-expired-circles',
  '0 * * * *', -- Every hour
  $$select archive_expired_circles();$$
);
```

**Option 2: External Cron Job**
```bash
# Call API endpoint every hour
curl -X POST https://your-domain.com/api/circles/archive
```

**Option 3: Manual Trigger**
```sql
-- In Supabase SQL editor
select archive_expired_circles();
```

### Location Consent Flow

1. User visits a circle page for the first time
2. If user has no location data and hasn't declined, modal appears
3. User can:
   - Accept: Browser requests geolocation, coordinates saved
   - Decline: Only consent flag saved (no coordinates)
4. Modal won't show again after decision is made
5. User can change preference in profile settings (future enhancement)

## 📊 Data Integrity

### Deduplication

- **RSVPs**: Unique constraint prevents duplicate joins
- **Meditation Logs**: Unique constraint prevents duplicate session logs
- **Cleanup Script**: Removes existing duplicates before constraints are added

### Archiving

- Circles are automatically archived when `scheduled_at + duration_minutes < now()`
- Archived circles are filtered from default list view
- Users can view archived circles via toggle

## 🔍 Testing Checklist

- [ ] Run migrations in development environment
- [ ] Test RSVP join (should prevent duplicates)
- [ ] Test meditation log (should prevent duplicates)
- [ ] Test location consent modal appears for new users
- [ ] Test globe markers only show consenting users
- [ ] Test archiving function manually
- [ ] Test archive view toggle
- [ ] Test profile page shows meditation sessions
- [ ] Verify RLS policies work correctly

## ⚠️ Notes

1. **Table Name Inconsistency**: 
   - `profile.astro` uses `user_profiles` table
   - `[id].astro` uses `profiles` table
   - Verify which table name is correct in your database
   - Update the incorrect references if needed

2. **Location Consent Modal**:
   - Only shows once per user (checks for existing decision)
   - Reloads page after consent to update markers
   - Uses browser geolocation API (requires HTTPS in production)

3. **Archiving**:
   - Runs based on `scheduled_at + duration_minutes`
   - Only archives circles with status 'active'
   - Consider timezone handling if needed

4. **Globe Markers**:
   - Only shows users with:
     - `location_share_enabled = true`
     - Valid `location_lat` and `location_lon`
   - No random fallback coordinates (removed)

## 🎯 Next Steps (Optional Enhancements)

1. Add profile settings page to manage location sharing
2. Add notification system for circle start times
3. Add circle search/filter functionality
4. Add circle analytics/statistics
5. Add ability to cancel circles
6. Add circle comments/discussion
7. Add circle reminders/notifications

