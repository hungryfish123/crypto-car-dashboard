import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useDynamicLinks = () => {
    const [links, setLinks] = useState({
        logo_redirect: 'https://x.com', // Fallback
        social_x: 'https://x.com',
        paint_unlock: 'https://x.com'
    });
    const [loading, setLoading] = useState(true);

    const fetchLinks = async () => {
        try {
            const { data, error } = await supabase
                .from('dynamic_links')
                .select('key, url');

            if (data) {
                const newLinks = { ...links };
                data.forEach(item => {
                    newLinks[item.key] = item.url;
                });
                setLinks(newLinks);
            }
        } catch (err) {
            console.error('Error fetching dynamic links:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, []);

    return { links, loading, refreshLinks: fetchLinks };
};
