import { supabase, isSupabaseConfigured } from './supabaseClient';

// Helper to generate a random referral code
const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Default initial state for new users
const DEFAULT_USER_DATA = {
    car_color: '#FF0000',
    inventory: [],
    equipped_parts: {
        Engines: null,
        Turbos: null,
        Suspensions: null,
        Wheels: null,
        Special: null
    },
    cash: 50000,
    net_worth: 0,
    referral_code: null,
    referral_earnings: 0,
    referred_by: null // Who referred this user
};

export const verifyReferralCode = async (code) => {
    if (!isSupabaseConfigured || !supabase) return { valid: false, error: 'DB not configured' };

    try {
        const { data, error } = await supabase
            .from('player_data')
            .select('wallet_id')
            .eq('referral_code', code.toUpperCase().trim())
            .single();

        return { valid: !!data, wallet_id: data?.wallet_id, error };
    } catch (err) {
        return { valid: false, error: err };
    }
};

export const fetchUserData = async (walletAddress, referredByCode = null) => {
    // Skip if Supabase not configured
    if (!isSupabaseConfigured || !supabase) {
        console.warn('Supabase not configured. Using default data.');
        return { wallet_id: walletAddress, ...DEFAULT_USER_DATA, referral_code: generateReferralCode() };
    }

    try {
        console.log('[DB] Fetching data for wallet:', walletAddress);
        // Check if user exists
        let { data, error } = await supabase
            .from('player_data')
            .select('*')
            .eq('wallet_id', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'Row not found'
            console.error('Error fetching user data:', error);
            return { wallet_id: walletAddress, ...DEFAULT_USER_DATA, referral_code: generateReferralCode() };
        }

        // If user doesn't exist, create them
        if (!data) {
            const newReferralCode = generateReferralCode();
            // Handle referral association if a code was provided
            let referredByWallet = null;
            if (referredByCode) {
                const { data: referrer } = await supabase
                    .from('player_data')
                    .select('wallet_id')
                    .eq('referral_code', referredByCode.toUpperCase().trim())
                    .single();
                referredByWallet = referrer?.wallet_id || null;
            }

            const { data: newData, error: insertError } = await supabase
                .from('player_data')
                .insert([
                    {
                        wallet_id: walletAddress,
                        ...DEFAULT_USER_DATA,
                        referral_code: newReferralCode,
                        referred_by: referredByWallet
                    }
                ])
                .select()
                .single();

            if (insertError) {
                console.error('[DB] Error creating new user:', insertError);
                // Fallback to local data
                return { wallet_id: walletAddress, ...DEFAULT_USER_DATA, referral_code: newReferralCode, referred_by: referredByWallet };
            }
            console.log('[DB] New user created successfully!' + (referredByWallet ? ` Referred by: ${referredByWallet}` : ''));
            return newData;
        }

        // If user exists but has no referral code (legacy users), generate and update
        if (!data.referral_code) {
            const newCode = generateReferralCode();
            await supabase
                .from('player_data')
                .update({ referral_code: newCode })
                .eq('wallet_id', walletAddress);
            data.referral_code = newCode;
        }

        return data;
    } catch (err) {
        console.error('Unexpected error in fetchUserData:', err);
        return { wallet_id: walletAddress, ...DEFAULT_USER_DATA, referral_code: generateReferralCode() };
    }
};

export const saveUserData = async (walletAddress, gameState) => {
    // Skip if Supabase not configured
    if (!isSupabaseConfigured || !supabase) {
        console.warn('Supabase not configured. Save skipped.');
        return;
    }

    try {
        const { error } = await supabase
            .from('player_data')
            .update({
                car_color: gameState.carColor,
                inventory: gameState.inventory,
                equipped_parts: gameState.equippedParts,
                cash: gameState.cash,
                net_worth: gameState.netWorth
            })
            .eq('wallet_id', walletAddress);

        if (error) {
            console.error('[DB] Error saving user data:', error);
        } else {
            console.log('[DB] ✅ Progress saved to Supabase for:', walletAddress);
        }
    } catch (err) {
        console.error('Unexpected error in saveUserData:', err);
    }
};

export const getReferralHistory = async (walletAddress) => {
    if (!isSupabaseConfigured || !supabase) return [];

    try {
        const { data, error } = await supabase
            .from('player_data')
            .select('wallet_id, created_at')
            .eq('referred_by', walletAddress)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DB] Error fetching referral history:', error);
            return [];
        }
        return data;
    } catch (err) {
        console.error('Unexpected error in getReferralHistory:', err);
        return [];
    }
};

// =========================================
// Burned Transactions Functions (REMOVED)
// =========================================

