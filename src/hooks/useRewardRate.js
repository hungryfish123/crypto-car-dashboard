import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useRewardRate = () => {
    const [rate, setRate] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRate = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_logs')
                    .select('details')
                    .eq('event_type', 'REWARD_DISTRIBUTION')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (data && data.length > 0) {
                    const details = data[0].details;
                    // details is JSONB, structure: { reward_per_point: number, ... }
                    if (details && details.reward_per_point) {
                        setRate(details.reward_per_point);
                    }
                }
            } catch (err) {
                console.error('Error fetching reward rate:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRate();
    }, []);

    return { rate, loading };
};
