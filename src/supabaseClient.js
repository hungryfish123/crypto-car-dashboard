import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL_HERE'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY_HERE'

// Check if credentials are configured
const isConfigured = supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL_HERE' &&
    supabaseKey !== 'YOUR_SUPABASE_ANON_KEY_HERE';

// Only create client if configured, otherwise create a mock
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const isSupabaseConfigured = isConfigured;
