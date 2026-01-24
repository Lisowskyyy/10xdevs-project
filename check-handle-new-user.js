import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bcpoolbiqzhgugcxwajt.supabase.co';
const serviceRoleKey = 'sb_secret_08spvMMGezDtTTLz9TZQ0Q_3uXI7vAZ';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkHandleNewUser() {
  try {
    console.log('🔍 Checking for handle_new_user function...');

    // Try to call the function (this will fail if it doesn't exist)
    try {
      const { data: funcData, error: funcError } = await supabase.rpc('handle_new_user');
      if (funcError) {
        console.log('❌ Function handle_new_user() does NOT exist or returned error:', funcError.message);
      } else {
        console.log('✅ Function handle_new_user() exists and can be called');
      }
    } catch (callError) {
      console.log('❌ Function handle_new_user() does NOT exist');
    }

    // Check profiles table structure
    console.log('\n🔍 Checking profiles table structure...');
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');

    if (colError) {
      console.log('❌ Error checking profiles table:', colError.message);
    } else {
      console.log('Profiles table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    }

    // Check if there are any profiles in the database
    console.log('\n🔍 Checking existing profiles...');
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, imie, nazwisko')
      .limit(5);

    if (profError) {
      console.log('❌ Error checking profiles data:', profError.message);
    } else {
      console.log(`Found ${profiles.length} profiles in database`);
      if (profiles.length > 0) {
        console.log('Sample profiles:');
        profiles.forEach(p => {
          console.log(`  - ID: ${p.id}, imie: ${p.imie}, nazwisko: ${p.nazwisko}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkHandleNewUser();