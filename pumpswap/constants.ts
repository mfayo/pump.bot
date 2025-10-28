import { PublicKey } from '@solana/web3.js';

// PumpSwap Program IDs (Note: Replace with actual PumpSwap program IDs)
export const PUMPSWAP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMPSWAP_AUTHORITY = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1');

// PumpSwap Fee Structure
export const PUMPSWAP_FEE_NUMERATOR = 25; // 0.25%
export const PUMPSWAP_FEE_DENOMINATOR = 10000;

// Pool Configuration
export const MIN_LIQUIDITY_THRESHOLD = 1; // Minimum liquidity in SOL
export const MAX_SLIPPAGE_BPS = 500; // 5% max slippage

// Trading Limits
export const MAX_POSITION_SIZE_SOL = 10;
export const MIN_POSITION_SIZE_SOL = 0.01;

// Monitoring Configuration
export const PRICE_CHECK_INTERVAL_MS = 1000; // Check price every second
export const POOL_REFRESH_INTERVAL_MS = 5000; // Refresh pool data every 5 seconds

// Risk Management
export const DEFAULT_TAKE_PROFIT_PERCENT = 50; // 50% profit
export const DEFAULT_STOP_LOSS_PERCENT = 30; // 30% loss
export const MAX_CONCURRENT_POSITIONS = 5;

// PumpSwap Pool States
export enum PoolState {
  UNINITIALIZED = 0,
  INITIALIZED = 1,
  ACTIVE = 2,
  PAUSED = 3,
  CLOSED = 4,
}

// Trading Strategy Types
export enum StrategyType {
  MOMENTUM = 'momentum',
  VOLUME = 'volume',
  LIQUIDITY = 'liquidity',
  CUSTOM = 'custom',
}
