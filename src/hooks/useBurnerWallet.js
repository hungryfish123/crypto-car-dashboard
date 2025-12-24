// useBurnerWallet.js - Ephemeral Wallet Hook
// Auto-generates and persists a Solana wallet in localStorage

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

// Storage key for the burner wallet
const STORAGE_KEY = 'burner_wallet_secret';

// Default Solana RPC endpoint (can be overridden)
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

/**
 * Custom hook for managing an ephemeral "burner" wallet
 * @param {string} rpcUrl - Solana RPC URL (defaults to mainnet)
 * @returns {Object} Wallet state and functions
 */
export function useBurnerWallet(rpcUrl = DEFAULT_RPC) {
    const [keypair, setKeypair] = useState(null);
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Create connection instance
    const connection = useMemo(() => new Connection(rpcUrl, 'confirmed'), [rpcUrl]);

    // Initialize or restore wallet on mount
    useEffect(() => {
        try {
            const storedSecret = localStorage.getItem(STORAGE_KEY);

            if (storedSecret) {
                // Restore existing wallet from localStorage
                const secretKeyBytes = bs58.decode(storedSecret);
                const restoredKeypair = Keypair.fromSecretKey(secretKeyBytes);
                setKeypair(restoredKeypair);
                console.log('Burner wallet restored:', restoredKeypair.publicKey.toString());
            } else {
                // Generate new wallet
                const newKeypair = Keypair.generate();
                const secretKeyBase58 = bs58.encode(newKeypair.secretKey);
                localStorage.setItem(STORAGE_KEY, secretKeyBase58);
                setKeypair(newKeypair);
                console.log('New burner wallet created:', newKeypair.publicKey.toString());
            }
        } catch (err) {
            console.error('Error initializing burner wallet:', err);
            setError('Failed to initialize wallet');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch balance function
    const refreshBalance = useCallback(async () => {
        if (!keypair) return;

        try {
            const balanceLamports = await connection.getBalance(keypair.publicKey);
            const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
            setBalance(balanceSOL);
            return balanceSOL;
        } catch (err) {
            console.error('Error fetching balance:', err);
            setError('Failed to fetch balance');
            return 0;
        }
    }, [keypair, connection]);

    // Fetch balance when keypair is available
    useEffect(() => {
        if (keypair) {
            refreshBalance();

            // Set up polling every 30 seconds
            const interval = setInterval(refreshBalance, 30000);
            return () => clearInterval(interval);
        }
    }, [keypair, refreshBalance]);

    // Get wallet address as string
    const walletAddress = useMemo(() => {
        return keypair ? keypair.publicKey.toString() : null;
    }, [keypair]);

    // Export private key as Base58 string
    const exportPrivateKey = useCallback(() => {
        if (!keypair) return null;
        return bs58.encode(keypair.secretKey);
    }, [keypair]);

    // Reset wallet - clears localStorage and generates fresh wallet
    const resetWallet = useCallback(() => {
        // Clear existing wallet
        localStorage.removeItem(STORAGE_KEY);

        // Generate new wallet
        const newKeypair = Keypair.generate();
        const secretKeyBase58 = bs58.encode(newKeypair.secretKey);
        localStorage.setItem(STORAGE_KEY, secretKeyBase58);

        setKeypair(newKeypair);
        setBalance(0);
        setError(null);

        console.log('Wallet reset. New address:', newKeypair.publicKey.toString());

        return newKeypair.publicKey.toString();
    }, []);

    // Import wallet from private key
    const importWallet = useCallback((privateKeyBase58) => {
        try {
            const secretKeyBytes = bs58.decode(privateKeyBase58);
            const importedKeypair = Keypair.fromSecretKey(secretKeyBytes);

            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, privateKeyBase58);

            setKeypair(importedKeypair);
            setError(null);

            console.log('Wallet imported:', importedKeypair.publicKey.toString());
            return true;
        } catch (err) {
            console.error('Error importing wallet:', err);
            setError('Invalid private key');
            return false;
        }
    }, []);

    // Check if wallet exists
    const hasWallet = useMemo(() => keypair !== null, [keypair]);

    return {
        // State
        walletAddress,
        balance,
        keypair,
        isLoading,
        error,
        hasWallet,
        connection,

        // Actions
        refreshBalance,
        exportPrivateKey,
        resetWallet,
        importWallet,
    };
}

export default useBurnerWallet;
