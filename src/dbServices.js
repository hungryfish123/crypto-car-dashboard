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

const DEFAULT_USER_DATA = {
    car_color: '#FF0000',
    theme_color: '#dc2626', // Red-600 (default accent)
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
    pending_rewards: 0,
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
            return { wallet_id: walletAddress, ...DEFAULT_USER_DATA, referral_code: null };
        }

        // If user doesn't exist, create them (referral_code will be set when username is chosen)
        if (!data) {
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
                        referral_code: null, // Will be set when username is chosen
                        referred_by: referredByWallet
                    }
                ])
                .select()
                .single();

            if (insertError) {
                console.error('[DB] Error creating new user:', insertError);
                // Fallback to local data
                return { wallet_id: walletAddress, ...DEFAULT_USER_DATA, referral_code: null, referred_by: referredByWallet };
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
                theme_color: gameState.themeColor,
                inventory: gameState.inventory,
                equipped_parts: gameState.equipped_parts,
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
// Profile System Functions (Using player_data)
// =========================================

export const getProfile = async (walletAddress) => {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
        const { data, error } = await supabase
            .from('player_data')
            .select('username')
            .eq('wallet_id', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') {
            // If column doesn't exist yet (migration pending), it might throw. 
            // But we assume migration is done.
            console.error('Error fetching profile:', error);
        }

        if (data && data.username) return { username: data.username, user_wallet: walletAddress };
        return null;
    } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        return null;
    }
};

export const createProfile = async (walletAddress, username) => {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
        // First try to update existing player_data
        // We act as "update" because fetchUserData normally creates the row on login.
        // Username becomes the referral code!
        const { data, error } = await supabase
            .from('player_data')
            .update({ username: username, referral_code: username.toUpperCase() })
            .eq('wallet_id', walletAddress)
            .select()
            .single();

        // If update returned no data (row missing), insert new with defaults
        if (!data && (!error || error.code === 'PGRST116')) {
            console.log('[DB] User missing in player_data, inserting new...');
            const { data: newData, error: insertError } = await supabase
                .from('player_data')
                .insert([{
                    wallet_id: walletAddress,
                    username: username,
                    ...DEFAULT_USER_DATA,
                    referral_code: username.toUpperCase() // Username = Referral Code
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            return newData; // Returns full row
        }

        if (error) throw error;
        return data; // Returns full row
    } catch (err) {
        console.error('Error saving username to player_data:', err);
        throw err;
    }
};

// =========================================
// Unlock Car System (No Burn)
// =========================================
export const unlockCar = async (walletAddress, carId) => {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: 'DB not configured' };

    try {
        // We are using the 'user_unlocks' table (as per reverted schema)
        const { error } = await supabase
            .from('user_unlocks')
            .insert([
                { user_wallet: walletAddress, car_id: carId }
            ]);

        if (error) {
            // Check for duplicate key violation (already unlocked)
            if (error.code === '23505') {
                return { success: true, message: 'Already unlocked' };
            }
            console.error('[DB] Error unlocking car:', error);
            throw error;
        }

        console.log(`[DB] Car ${carId} unlocked for ${walletAddress}`);
        return { success: true };
    } catch (err) {
        console.error('Unlock car failed:', err);
        return { success: false, error: err.message };
    }
};
