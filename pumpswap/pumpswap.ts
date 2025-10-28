import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
  Commitment,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
} from '@solana/spl-token';
import { Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { PumpSwapPoolInfo, TradeParams, Position } from './types';
import { PUMPSWAP_PROGRAM_ID, MAX_SLIPPAGE_BPS } from './constants';
import { Logger } from 'pino';

export class PumpSwapClient {
  private connection: Connection;
  private wallet: Keypair;
  private logger: Logger;
  private commitment: Commitment;

  constructor(
    connection: Connection,
    wallet: Keypair,
    logger: Logger,
    commitment: Commitment = 'confirmed'
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.logger = logger;
    this.commitment = commitment;
  }

  /**
   * Fetch pool information from PumpSwap
   */
  async getPoolInfo(poolId: PublicKey): Promise<PumpSwapPoolInfo | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(poolId, this.commitment);
      
      if (!accountInfo) {
        this.logger.warn({ poolId: poolId.toString() }, 'Pool account not found');
        return null;
      }

      // Parse pool data (structure depends on PumpSwap's actual implementation)
      // This is a placeholder - adjust based on actual PumpSwap pool layout
      const data = accountInfo.data;
      
      // Example parsing (adjust offsets based on actual layout)
      const poolInfo: PumpSwapPoolInfo = {
        poolId,
        baseMint: new PublicKey(data.slice(8, 40)),
        quoteMint: new PublicKey(data.slice(40, 72)),
        baseVault: new PublicKey(data.slice(72, 104)),
        quoteVault: new PublicKey(data.slice(104, 136)),
        lpMint: new PublicKey(data.slice(136, 168)),
        baseDecimals: data[168],
        quoteDecimals: data[169],
        state: data[170],
        baseReserve: BigInt(0), // Parse from data
        quoteReserve: BigInt(0), // Parse from data
        lpSupply: BigInt(0), // Parse from data
        createdAt: Date.now(),
      };

      return poolInfo;
    } catch (error) {
      this.logger.error({ error, poolId: poolId.toString() }, 'Failed to fetch pool info');
      return null;
    }
  }

  /**
   * Calculate output amount for a swap
   */
  calculateSwapOutput(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeBps: number = 25
  ): bigint {
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
      return BigInt(0);
    }

    // Apply fee
    const amountInWithFee = amountIn * BigInt(10000 - feeBps);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * BigInt(10000) + amountInWithFee;

    return numerator / denominator;
  }

  /**
   * Execute a buy transaction on PumpSwap
   */
  async buy(
    poolInfo: PumpSwapPoolInfo,
    amountIn: bigint,
    minAmountOut: bigint,
    slippageBps: number = MAX_SLIPPAGE_BPS
  ): Promise<string | null> {
    try {
      const tokenAccount = getAssociatedTokenAddressSync(
        poolInfo.baseMint,
        this.wallet.publicKey
      );

      const quoteTokenAccount = getAssociatedTokenAddressSync(
        poolInfo.quoteMint,
        this.wallet.publicKey
      );

      // Build swap instruction (placeholder - adjust based on actual PumpSwap instruction format)
      const swapInstruction = await this.createSwapInstruction(
        poolInfo,
        quoteTokenAccount,
        tokenAccount,
        amountIn,
        minAmountOut,
        true // isBuy
      );

      const latestBlockhash = await this.connection.getLatestBlockhash(this.commitment);

      const messageV0 = new TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }),
          createAssociatedTokenAccountIdempotentInstruction(
            this.wallet.publicKey,
            tokenAccount,
            this.wallet.publicKey,
            poolInfo.baseMint
          ),
          swapInstruction,
        ],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([this.wallet]);

      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: true,
          maxRetries: 3,
        }
      );

      this.logger.info(
        { mint: poolInfo.baseMint.toString(), signature },
        'Buy transaction sent'
      );

      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          blockhash: latestBlockhash.blockhash,
        },
        this.commitment
      );

      if (confirmation.value.err) {
        this.logger.error(
          { signature, error: confirmation.value.err },
          'Buy transaction failed'
        );
        return null;
      }

      this.logger.info(
        {
          signature,
          url: `https://solscan.io/tx/${signature}`,
          dex: `https://dexscreener.com/solana/${poolInfo.baseMint.toString()}`,
        },
        'Buy transaction confirmed'
      );

      return signature;
    } catch (error) {
      this.logger.error({ error }, 'Failed to execute buy');
      return null;
    }
  }

  /**
   * Execute a sell transaction on PumpSwap
   */
  async sell(
    poolInfo: PumpSwapPoolInfo,
    amountIn: bigint,
    minAmountOut: bigint,
    slippageBps: number = MAX_SLIPPAGE_BPS
  ): Promise<string | null> {
    try {
      const tokenAccount = getAssociatedTokenAddressSync(
        poolInfo.baseMint,
        this.wallet.publicKey
      );

      const quoteTokenAccount = getAssociatedTokenAddressSync(
        poolInfo.quoteMint,
        this.wallet.publicKey
      );

      // Build swap instruction
      const swapInstruction = await this.createSwapInstruction(
        poolInfo,
        tokenAccount,
        quoteTokenAccount,
        amountIn,
        minAmountOut,
        false // isSell
      );

      const latestBlockhash = await this.connection.getLatestBlockhash(this.commitment);

      const messageV0 = new TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 150000 }),
          swapInstruction,
          createCloseAccountInstruction(
            tokenAccount,
            this.wallet.publicKey,
            this.wallet.publicKey
          ),
        ],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([this.wallet]);

      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        }
      );

      this.logger.info(
        { mint: poolInfo.baseMint.toString(), signature },
        'Sell transaction sent'
      );

      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          blockhash: latestBlockhash.blockhash,
        },
        this.commitment
      );

      if (confirmation.value.err) {
        this.logger.error(
          { signature, error: confirmation.value.err },
          'Sell transaction failed'
        );
        return null;
      }

      this.logger.info(
        {
          signature,
          url: `https://solscan.io/tx/${signature}`,
        },
        'Sell transaction confirmed'
      );

      return signature;
    } catch (error) {
      this.logger.error({ error }, 'Failed to execute sell');
      return null;
    }
  }

  /**
   * Create swap instruction for PumpSwap
   * Note: This is a placeholder - adjust based on actual PumpSwap instruction format
   */
  private async createSwapInstruction(
    poolInfo: PumpSwapPoolInfo,
    sourceAccount: PublicKey,
    destinationAccount: PublicKey,
    amountIn: bigint,
    minAmountOut: bigint,
    isBuy: boolean
  ): Promise<TransactionInstruction> {
    // This is a placeholder implementation
    // Replace with actual PumpSwap instruction builder
    
    const keys = [
      { pubkey: PUMPSWAP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: poolInfo.poolId, isSigner: false, isWritable: true },
      { pubkey: poolInfo.baseVault, isSigner: false, isWritable: true },
      { pubkey: poolInfo.quoteVault, isSigner: false, isWritable: true },
      { pubkey: sourceAccount, isSigner: false, isWritable: true },
      { pubkey: destinationAccount, isSigner: false, isWritable: true },
      { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Build instruction data (adjust based on actual format)
    const data = Buffer.alloc(24);
    data.writeUInt8(isBuy ? 1 : 2, 0); // Instruction discriminator
    data.writeBigUInt64LE(amountIn, 1);
    data.writeBigUInt64LE(minAmountOut, 9);

    return new TransactionInstruction({
      keys,
      programId: PUMPSWAP_PROGRAM_ID,
      data,
    });
  }

  /**
   * Get current price from pool reserves
   */
  async getCurrentPrice(poolInfo: PumpSwapPoolInfo): Promise<number> {
    try {
      // Refresh pool data
      const freshPoolInfo = await this.getPoolInfo(poolInfo.poolId);
      if (!freshPoolInfo) {
        return 0;
      }

      if (freshPoolInfo.baseReserve === BigInt(0)) {
        return 0;
      }

      // Calculate price as quote/base
      const price =
        Number(freshPoolInfo.quoteReserve) / Number(freshPoolInfo.baseReserve);
      
      // Adjust for decimals
      const decimalAdjustment = Math.pow(10, freshPoolInfo.quoteDecimals - freshPoolInfo.baseDecimals);
      
      return price * decimalAdjustment;
    } catch (error) {
      this.logger.error({ error }, 'Failed to get current price');
      return 0;
    }
  }

  /**
   * Check if pool has sufficient liquidity
   */
  async hasMinimumLiquidity(
    poolInfo: PumpSwapPoolInfo,
    minLiquiditySOL: number
  ): Promise<boolean> {
    try {
      const quoteReserveSOL = Number(poolInfo.quoteReserve) / Math.pow(10, poolInfo.quoteDecimals);
      return quoteReserveSOL >= minLiquiditySOL;
    } catch (error) {
      this.logger.error({ error }, 'Failed to check liquidity');
      return false;
    }
  }
}
