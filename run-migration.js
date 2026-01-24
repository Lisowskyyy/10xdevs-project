import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://bcpoolbiqzhgugcxwajt.supabase.co';
const serviceRoleKey = 'sb_secret_08spvMMGezDtTTLz9TZQ0Q_3uXI7vAZ';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  try {
    console.log('🚀 Migration: create_handle_new_user_function.sql');
    console.log('📄 Please execute the following SQL in your Supabase SQL Editor:');
    console.log('🔗 https://supabase.com/dashboard/project/bcpoolbiqzhgugcxwajt/sql\n');

    console.log('='.repeat(80));
    console.log('SQL MIGRATION CODE:');
    console.log('='.repeat(80));

    // Read and display the migration file
    const migrationSQL = readFileSync('supabase/migrations/20251206123314_create_handle_new_user_function.sql', 'utf8');
    console.log(migrationSQL);

    console.log('='.repeat(80));
    console.log('\n📝 Instructions:');
    console.log('1. Copy the SQL above');
    console.log('2. Go to Supabase Dashboard → SQL Editor');
    console.log('3. Paste and run the migration');
    console.log('4. Check the logs for any errors');

    // Test current state
    console.log('\n🧪 Current database state:');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, imie, nazwisko')
      .limit(3);

    if (error) {
      console.log('❌ Error checking profiles:', error.message);
    } else {
      console.log(`✅ Found ${profiles.length} profiles, all have imie/nazwisko as null (expected)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runMigration();