-- Add race_notify link to dynamic_links table
INSERT INTO public.dynamic_links (key, url, label)
VALUES 
    ('race_notify', 'https://x.com', 'Notify When Live Button')
ON CONFLICT (key) DO NOTHING;
