import { PublicKey } from '@solana/web3.js';
import { PoolState, StrategyType } from './constants';

export interface PumpSwapPoolInfo {
  poolId: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  lpMint: PublicKey;
  baseDecimals: number;
  quoteDecimals: number;
  state: PoolState;
  baseReserve: bigint;
  quoteReserve: bigint;
  lpSupply: bigint;
  createdAt: number;
}

export interface TradeParams {
  poolId: PublicKey;
  tokenMint: PublicKey;
  amountIn: bigint;
  minAmountOut: bigint;
  slippageBps: number;
}

export interface Position {
  mint: PublicKey;
  poolId: PublicKey;
  entryPrice: number;
  amount: bigint;
  buyValue: number;
  timestamp: number;
  strategy: StrategyType;
}

export interface TradingStrategy {
  type: StrategyType;
  shouldBuy: (poolInfo: PumpSwapPoolInfo) => Promise<boolean>;
  shouldSell: (position: Position, currentPrice: number) => Promise<boolean>;
  calculatePositionSize: (poolInfo: PumpSwapPoolInfo) => bigint;
}

export interface PriceData {
  price: number;
  timestamp: number;
  volume24h?: number;
  liquidity?: number;
  priceChange24h?: number;
}

export interface RiskMetrics {
  totalPositions: number;
  totalValueLocked: number;
  unrealizedPnL: number;
  winRate: number;
  averageHoldTime: number;
}
