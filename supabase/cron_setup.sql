-- ============================================================================
-- CRON JOB SETUP FOR REWARD DISTRIBUTION
-- Run this AFTER deploying the Edge Function
-- ============================================================================

-- 1. Enable pg_cron extension (if not already enabled)
-- Note: This may require Supabase Pro plan or database access
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Schedule the distribute-rewards function to run every hour
-- Replace YOUR_PROJECT_REF with your Supabase project reference (e.g., abcdefghijkl)
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key

SELECT cron.schedule(
    'distribute-rewards-hourly',  -- Job name (for reference)
    '0 * * * *',                   -- Cron expression: Every hour at :00
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/distribute-rewards',
        headers := jsonb_build_object(
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ============================================================================
-- USEFUL CRON MANAGEMENT COMMANDS
-- ============================================================================

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

-- View job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Unschedule a job:
-- SELECT cron.unschedule('distribute-rewards-hourly');

-- Test the function manually (one-time):
-- SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/distribute-rewards',
--     headers := jsonb_build_object(
--         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--         'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
-- );
