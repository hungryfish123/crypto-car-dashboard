// =====================================================
// useWalletSync - Frontend Hook for Wallet Synchronization
// Syncs wallet holdings with database on connect
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

interface SyncResult {
    item_id: string;
    item_name: string;
    contract_address: string;
    balance: number;
    action: 'added' | 'updated' | 'removed';
}

interface InventoryItem {
    item_id: string;
    balance: number;
    name: string;
    rarity: string;
    contract_address: string;
}

interface WalletSyncResponse {
    success: boolean;
    wallet: string;
    items_synced: number;
    sync_results: SyncResult[];
    inventory: InventoryItem[];
    total_unique_items: number;
}

export function useWalletSync() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState < Date | null > (null);
    const [syncError, setSyncError] = useState < string | null > (null);
    const [inventory, setInventory] = useState < InventoryItem[] > ([]);

    /**
     * Sync a wallet's holdings with the database
     * Call this immediately after wallet connect
     */
    const syncWallet = useCallback(async (walletAddress: string): Promise<WalletSyncResponse | null> => {
        if (!walletAddress) {
            setSyncError('No wallet address provided');
            return null;
        }

        setIsSyncing(true);
        setSyncError(null);

        try {
            console.log('[useWalletSync] Syncing wallet:', walletAddress);

            const { data, error } = await supabase.functions.invoke('sync-wallet', {
                body: { user_wallet: walletAddress },
            });

            if (error) {
                throw new Error(error.message);
            }

            if (data?.success) {
                setInventory(data.inventory || []);
                setLastSync(new Date());
                console.log('[useWalletSync] Sync complete:', {
                    items_synced: data.items_synced,
                    total_items: data.total_unique_items,
                });
                return data as WalletSyncResponse;
            } else {
                throw new Error(data?.error || 'Sync failed');
            }
        } catch (err: any) {
            console.error('[useWalletSync] Error:', err);
            setSyncError(err.message);
            return null;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    /**
     * Get inventory directly from database (without Moralis call)
     * Faster for UI updates, use when sync isn't needed
     */
    const getInventory = useCallback(async (walletAddress: string): Promise<InventoryItem[]> => {
        if (!walletAddress) return [];

        try {
            const { data, error } = await supabase
                .from('user_holdings')
                .select(`
          item_id,
          balance,
          items (
            id,
            name,
            contract_address,
            rarity
          )
        `)
                .eq('user_wallet', walletAddress)
                .gt('balance', 0);

            if (error) throw error;

            const items: InventoryItem[] = (data || []).map((holding: any) => ({
                item_id: holding.item_id,
                balance: parseFloat(holding.balance),
                name: holding.items?.name,
                rarity: holding.items?.rarity,
                contract_address: holding.items?.contract_address,
            }));

            setInventory(items);
            return items;
        } catch (err) {
            console.error('[useWalletSync] getInventory error:', err);
            return [];
        }
    }, []);

    /**
     * Check if user owns a specific item
     */
    const ownsItem = useCallback((contractAddress: string): boolean => {
        return inventory.some(
            (item) => item.contract_address?.toLowerCase() === contractAddress.toLowerCase() && item.balance > 0
        );
    }, [inventory]);

    /**
     * Get balance of a specific item
     */
    const getItemBalance = useCallback((contractAddress: string): number => {
        const item = inventory.find(
            (item) => item.contract_address?.toLowerCase() === contractAddress.toLowerCase()
        );
        return item?.balance || 0;
    }, [inventory]);

    return {
        // State
        isSyncing,
        lastSync,
        syncError,
        inventory,

        // Actions
        syncWallet,
        getInventory,
        ownsItem,
        getItemBalance,
    };
}

export default useWalletSync;
