import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ssxsjafkzuqikmobhihl.supabase.co'
const supabaseKey = 'sb_publishable_yh6HGG6kP6i3ZETH-EBPCQ_682mDH7R'

// Check if credentials are configured
const isConfigured = supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL_HERE' &&
    supabaseKey !== 'YOUR_SUPABASE_ANON_KEY_HERE';

// Only create client if configured, otherwise create a mock
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const isSupabaseConfigured = isConfigured;

// Test connection on load (check browser console for result)
if (supabase) {
    supabase.from('user_data').select('count', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                console.log('🔴 Supabase connection FAILED:', error.message);
            } else {
                console.log('🟢 Supabase connected! user_data table has', count, 'rows');
            }
        });
}
