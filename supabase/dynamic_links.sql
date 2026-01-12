-- Create dynamic_links table
CREATE TABLE IF NOT EXISTS public.dynamic_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    label TEXT, -- Optional human-readable label
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.dynamic_links ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public Read Access
DROP POLICY IF EXISTS "Public Read Access" ON public.dynamic_links;
CREATE POLICY "Public Read Access" ON public.dynamic_links
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. Admin Update Access (Allow Anon because AdminPanel uses client-side code protection)
DROP POLICY IF EXISTS "Admin Update Access" ON public.dynamic_links;
CREATE POLICY "Admin Update Access" ON public.dynamic_links
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Insert Access" ON public.dynamic_links;
CREATE POLICY "Admin Insert Access" ON public.dynamic_links
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Insert Default Links
INSERT INTO public.dynamic_links (key, url, label) VALUES
    ('logo_redirect', 'https://jup.ag/', 'Main Logo Redirect'),
    ('social_x', 'https://x.com', 'X (Twitter) Profile'),
    ('paint_unlock', 'https://x.com', 'Paint Shop Unlock Action'),
    ('race_notify', 'https://x.com', 'Notify When Live Button')
ON CONFLICT (key) DO NOTHING;
