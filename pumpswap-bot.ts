import {
  Connection,
  Keypair,
  PublicKey,
  Commitment,
  KeyedAccountInfo,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  AccountLayout,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Token, TokenAmount } from '@raydium-io/raydium-sdk';
import pino from 'pino';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

import { PumpSwapClient } from './pumpswap/pumpswap';
import { PumpSwapPoolInfo, Position } from './pumpswap/types';
import {
  PUMPSWAP_PROGRAM_ID,
  StrategyType,
  DEFAULT_TAKE_PROFIT_PERCENT,
  DEFAULT_STOP_LOSS_PERCENT,
  MAX_CONCURRENT_POSITIONS,
} from './pumpswap/constants';
import { StrategyManager } from './strategies/strategy-manager';
import { retrieveEnvVariable, retrieveTokenValueByAddress, retry, sleep } from './utils';
import { getTokenAccounts } from './liquidity';

// Setup logger
const transport = pino.transport({
  targets: [
    {
      level: 'trace',
      target: 'pino-pretty',
      options: {},
    },
  ],
});

export const logger = pino(
  {
    level: 'info',
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport
);

// Configuration
const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT', logger);
const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT', logger);
const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
const QUOTE_MINT = retrieveEnvVariable('QUOTE_MINT', logger);
const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', logger);
const COMMITMENT_LEVEL = retrieveEnvVariable('COMMITMENT_LEVEL', logger) as Commitment;
const AUTO_SELL = retrieveEnvVariable('AUTO_SELL', logger) === 'true';
const USE_SNIPE_LIST = retrieveEnvVariable('USE_SNIPE_LIST', logger) === 'true';
const SNIPE_LIST_REFRESH_INTERVAL = Number(retrieveEnvVariable('SNIPE_LIST_REFRESH_INTERVAL', logger));
const MIN_POOL_SIZE = Number(retrieveEnvVariable('MIN_POOL_SIZE', logger));
const TRADING_STRATEGY = (process.env.TRADING_STRATEGY || 'momentum') as StrategyType;

// State management
let wallet: Keypair;
let quoteToken: Token;
let quoteTokenAssociatedAddress: PublicKey;
let quoteAmount: TokenAmount;
let pumpSwapClient: PumpSwapClient;
let strategyManager: StrategyManager;
let solanaConnection: Connection;

let existingPools: Set<string> = new Set();
let activePositions: Map<string, Position> = new Map();
let snipeList: string[] = [];

/**
 * Initialize the bot
 */
async function init(): Promise<void> {
  logger.info('🚀 Initializing PumpSwap Trading Bot...');

  // Initialize connection
  solanaConnection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
    commitment: COMMITMENT_LEVEL,
  });

  // Initialize wallet
  wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  logger.info(`💼 Wallet Address: ${wallet.publicKey.toString()}`);

  // Initialize quote token
  switch (QUOTE_MINT) {
    case 'WSOL':
      quoteToken = Token.WSOL;
      quoteAmount = new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false);
      break;
    case 'USDC':
      quoteToken = new Token(
        TOKEN_PROGRAM_ID,
        new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        6,
        'USDC',
        'USDC'
      );
      quoteAmount = new TokenAmount(quoteToken, QUOTE_AMOUNT, false);
      break;
    default:
      throw new Error(`Unsupported quote mint "${QUOTE_MINT}". Supported values are USDC and WSOL`);
  }

  // Check for quote token account
  const tokenAccounts = await getTokenAccounts(solanaConnection, wallet.publicKey, COMMITMENT_LEVEL);
  const tokenAccount = tokenAccounts.find((acc) => acc.accountInfo.mint.toString() === quoteToken.mint.toString());

  if (!tokenAccount) {
    throw new Error(`No ${quoteToken.symbol} token account found in wallet: ${wallet.publicKey}`);
  }

  quoteTokenAssociatedAddress = tokenAccount.pubkey;

  // Initialize PumpSwap client
  pumpSwapClient = new PumpSwapClient(solanaConnection, wallet, logger, COMMITMENT_LEVEL);

  // Initialize strategy manager
  strategyManager = new StrategyManager(logger, TRADING_STRATEGY);

  // Load snipe list if enabled
  if (USE_SNIPE_LIST) {
    loadSnipeList();
  }

  // Log configuration
  logger.info('⚙️  Configuration:');
  logger.info(`   Strategy: ${TRADING_STRATEGY}`);
  logger.info(`   Quote Token: ${quoteToken.symbol}`);
  logger.info(`   Trade Amount: ${quoteAmount.toFixed()} ${quoteToken.symbol}`);
  logger.info(`   Min Pool Size: ${MIN_POOL_SIZE} ${quoteToken.symbol}`);
  logger.info(`   Auto Sell: ${AUTO_SELL}`);
  logger.info(`   Snipe List: ${USE_SNIPE_LIST}`);
  logger.info(`   Max Positions: ${MAX_CONCURRENT_POSITIONS}`);

  logger.info('✅ Initialization complete!');
}

/**
 * Load snipe list from file
 */
function loadSnipeList(): void {
  try {
    const count = snipeList.length;
    const data = fs.readFileSync(path.join(__dirname, 'snipe-list.txt'), 'utf-8');
    snipeList = data
      .split('\n')
      .map((a) => a.trim())
      .filter((a) => a);

    if (snipeList.length !== count) {
      logger.info(`📋 Loaded snipe list: ${snipeList.length} tokens`);
    }
  } catch (error) {
    logger.warn('Failed to load snipe list');
  }
}

/**
 * Check if should buy token
 */
function shouldBuy(mintAddress: string): boolean {
  return USE_SNIPE_LIST ? snipeList.includes(mintAddress) : true;
}

/**
 * Process new PumpSwap pool
 */
async function processPumpSwapPool(poolId: PublicKey): Promise<void> {
  try {
    // Fetch pool information
    const poolInfo = await pumpSwapClient.getPoolInfo(poolId);
    
    if (!poolInfo) {
      logger.warn({ poolId: poolId.toString() }, 'Failed to fetch pool info');
      return;
    }

    const mintAddress = poolInfo.baseMint.toString();

    // Check if should buy this token
    if (!shouldBuy(mintAddress)) {
      logger.debug({ mint: mintAddress }, 'Token not in snipe list, skipping');
      return;
    }

    // Check if already have position
    if (activePositions.has(mintAddress)) {
      logger.debug({ mint: mintAddress }, 'Already have position, skipping');
      return;
    }

    // Check max concurrent positions
    if (activePositions.size >= MAX_CONCURRENT_POSITIONS) {
      logger.warn('Max concurrent positions reached, skipping');
      return;
    }

    // Check minimum liquidity
    const hasMinLiquidity = await pumpSwapClient.hasMinimumLiquidity(poolInfo, MIN_POOL_SIZE);
    if (!hasMinLiquidity) {
      logger.debug({ mint: mintAddress }, 'Insufficient liquidity, skipping');
      return;
    }

    // Evaluate strategy
    const shouldBuyToken = await strategyManager.shouldBuy(poolInfo);
    if (!shouldBuyToken) {
      logger.debug({ mint: mintAddress }, 'Strategy declined buy, skipping');
      return;
    }

    // Calculate position size
    const positionSize = strategyManager.calculatePositionSize(poolInfo);

    // Execute buy
    logger.info({ mint: mintAddress }, '🎯 Buying token...');
    
    const minAmountOut = BigInt(0); // Accept any amount (adjust for production)
    const signature = await pumpSwapClient.buy(poolInfo, positionSize, minAmountOut);

    if (signature) {
      // Get current price
      const currentPrice = await pumpSwapClient.getCurrentPrice(poolInfo);

      // Create position
      const position: Position = {
        mint: poolInfo.baseMint,
        poolId: poolInfo.poolId,
        entryPrice: currentPrice,
        amount: positionSize,
        buyValue: currentPrice,
        timestamp: Date.now(),
        strategy: strategyManager.getActiveStrategy()?.type || StrategyType.MOMENTUM,
      };

      activePositions.set(mintAddress, position);

      logger.info(
        {
          mint: mintAddress,
          price: currentPrice,
          amount: positionSize.toString(),
          signature,
        },
        '✅ Buy successful'
      );
    }
  } catch (error) {
    logger.error({ error, poolId: poolId.toString() }, 'Failed to process pool');
  }
}

/**
 * Monitor positions and execute sells
 */
async function monitorPositions(): Promise<void> {
  if (activePositions.size === 0) {
    return;
  }

  logger.debug(`Monitoring ${activePositions.size} positions...`);

  for (const [mintAddress, position] of activePositions.entries()) {
    try {
      // Get current price
      const currentPrice = await retrieveTokenValueByAddress(mintAddress);

      if (!currentPrice) {
        logger.warn({ mint: mintAddress }, 'Failed to fetch current price');
        continue;
      }

      logger.debug(
        {
          mint: mintAddress,
          entryPrice: position.entryPrice,
          currentPrice,
          pnl: ((currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(2) + '%',
        },
        'Position update'
      );

      // Check if should sell
      const shouldSellToken = await strategyManager.shouldSell(position, currentPrice);

      if (shouldSellToken) {
        logger.info({ mint: mintAddress }, '💰 Selling token...');

        // Get pool info
        const poolInfo = await pumpSwapClient.getPoolInfo(position.poolId);
        
        if (poolInfo) {
          const minAmountOut = BigInt(0); // Accept any amount (adjust for production)
          const signature = await pumpSwapClient.sell(poolInfo, position.amount, minAmountOut);

          if (signature) {
            const pnl = ((currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(2);
            
            logger.info(
              {
                mint: mintAddress,
                entryPrice: position.entryPrice,
                exitPrice: currentPrice,
                pnl: pnl + '%',
                signature,
              },
              '✅ Sell successful'
            );

            // Remove position
            activePositions.delete(mintAddress);
          }
        }
      }
    } catch (error) {
      logger.error({ error, mint: mintAddress }, 'Failed to monitor position');
    }
  }
}

/**
 * Start the bot
 */
async function start(): Promise<void> {
  await init();

  logger.info('🎯 Starting PumpSwap bot...');
  logger.info(`📡 Listening for new pools on PumpSwap...`);

  // Subscribe to PumpSwap program account changes
  const subscriptionId = solanaConnection.onProgramAccountChange(
    PUMPSWAP_PROGRAM_ID,
    async (updatedAccountInfo: KeyedAccountInfo) => {
      const poolId = updatedAccountInfo.accountId;
      const key = poolId.toString();

      if (!existingPools.has(key)) {
        existingPools.add(key);
        logger.info({ poolId: key }, '🆕 New pool detected');
        
        // Process pool in background
        processPumpSwapPool(poolId).catch((error) => {
          logger.error({ error, poolId: key }, 'Error processing pool');
        });
      }
    },
    COMMITMENT_LEVEL,
    [
      {
        dataSize: 256, // Adjust based on actual PumpSwap pool size
      },
    ]
  );

  logger.info(`✅ Subscribed to PumpSwap pools: ${subscriptionId}`);

  // Start position monitoring loop if auto-sell is enabled
  if (AUTO_SELL) {
    logger.info('🔄 Starting position monitoring...');
    
    setInterval(async () => {
      await monitorPositions();
    }, 5000); // Check every 5 seconds
  }

  // Refresh snipe list periodically
  if (USE_SNIPE_LIST) {
    setInterval(loadSnipeList, SNIPE_LIST_REFRESH_INTERVAL);
  }

  // Log status periodically
  setInterval(() => {
    logger.info({
      activePositions: activePositions.size,
      trackedPools: existingPools.size,
      strategy: strategyManager.getActiveStrategy()?.type,
    }, '📊 Bot Status');
  }, 60000); // Every minute
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Shutting down bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Shutting down bot...');
  process.exit(0);
});

// Start the bot
start().catch((error) => {
  logger.error({ error }, '❌ Fatal error');
  process.exit(1);
});
