import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

// Configuration
const TARGET_WALLET_ADDRESS = 'D8VVA2cxn9s6WfeoEdbjGWVDxRcCg2F1SjytfvfqX6sF';
const MINT_AMOUNT = 100000;
const DECIMALS = 9;

// Connect to Devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const main = async () => {
    console.log("🚀 Starting Mint Script for 'Peter Coin'...");
    console.log(`🎯 Target Wallet: ${TARGET_WALLET_ADDRESS}`);

    // 1. Setup Payer (Generate ephemeral wallet for fees)
    const payer = Keypair.generate();
    console.log(`💳 Generated Payer Wallet: ${payer.publicKey.toBase58()}`);

    // 2. Airdrop SOL to Payer
    console.log("💧 Requesting Airdrop (1 SOL)...");
    try {
        const airdropSignature = await connection.requestAirdrop(
            payer.publicKey,
            1 * LAMPORTS_PER_SOL
        );

        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: airdropSignature,
        });
        console.log("✅ Airdrop confirmed!");
    } catch (err) {
        console.error("❌ Airdrop failed. Devnet might be congested.");
        console.error(err);
        return;
    }

    // 3. Create New Token Mint
    console.log("🏭 Creating new Token Mint...");
    let mintAddress;
    try {
        mintAddress = await createMint(
            connection,
            payer,
            payer.publicKey, // Mint Authority
            null,            // Freeze Authority
            DECIMALS         // Decimals
        );
        console.log(`✨ Mint Created! Address: ${mintAddress.toBase58()}`);
    } catch (err) {
        console.error("❌ Failed to create mint.");
        console.error(err);
        return;
    }

    // 4. Get or Create Target User's Associated Token Account
    console.log("👤 getting/creating associated token account for user...");
    const targetPublicKey = new PublicKey(TARGET_WALLET_ADDRESS);
    let tokenAccount;
    try {
        tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mintAddress,
            targetPublicKey
        );
        console.log(`📂 Token Account: ${tokenAccount.address.toBase58()}`);
    } catch (err) {
        console.error("❌ Failed to get/create token account.");
        console.error(err);
        return;
    }

    // 5. Mint Tokens to User
    console.log(`💸 Minting ${MINT_AMOUNT} tokens to user...`);
    try {
        // Adjust amount for decimals (Amount * 10^Decimals)
        const amountToMint = BigInt(MINT_AMOUNT * 10 ** DECIMALS);

        const txSignature = await mintTo(
            connection,
            payer,
            mintAddress,
            tokenAccount.address,
            payer,
            amountToMint
        );

        console.log("✅ Tokens Minted Successfully!");
        console.log(`📜 Transaction Signature: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);
        console.log("\n===========================================");
        console.log("🔑 YOUR MINT ADDRESS (Copy this to your app):");
        console.log(mintAddress.toBase58());
        console.log("===========================================\n");

    } catch (err) {
        console.error("❌ Failed to mint tokens.");
        console.error(err);
    }
};

main();
