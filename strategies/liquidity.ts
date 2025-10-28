import { TradingStrategy, PumpSwapPoolInfo, Position } from '../pumpswap/types';
import { StrategyType } from '../pumpswap/constants';

/**
 * Liquidity-Based Trading Strategy
 * Focuses on pools with strong liquidity and stable growth
 * Conservative approach with emphasis on risk management
 */
export class LiquidityStrategy implements TradingStrategy {
  type: StrategyType = StrategyType.LIQUIDITY;

  private readonly minLiquiditySOL: number;
  private readonly maxPriceImpact: number;
  private readonly takeProfitPercent: number;
  private readonly stopLossPercent: number;
  private readonly liquidityGrowthThreshold: number;

  constructor(
    minLiquiditySOL: number = 10, // 10 SOL minimum liquidity
    maxPriceImpact: number = 2, // Max 2% price impact
    takeProfitPercent: number = 30,
    stopLossPercent: number = 20,
    liquidityGrowthThreshold: number = 20 // 20% liquidity growth
  ) {
    this.minLiquiditySOL = minLiquiditySOL;
    this.maxPriceImpact = maxPriceImpact;
    this.takeProfitPercent = takeProfitPercent;
    this.stopLossPercent = stopLossPercent;
    this.liquidityGrowthThreshold = liquidityGrowthThreshold;
  }

  async shouldBuy(poolInfo: PumpSwapPoolInfo): Promise<boolean> {
    try {
      // Check minimum liquidity requirement
      const liquiditySOL = Number(poolInfo.quoteReserve) / Math.pow(10, poolInfo.quoteDecimals);
      
      if (liquiditySOL < this.minLiquiditySOL) {
        return false;
      }

      // Calculate price impact for a standard trade size (0.1 SOL)
      const tradeSize = BigInt(100_000_000); // 0.1 SOL in lamports
      const priceImpact = this.calculatePriceImpact(
        tradeSize,
        poolInfo.quoteReserve,
        poolInfo.baseReserve
      );

      // Only buy if price impact is acceptable
      if (priceImpact > this.maxPriceImpact) {
        return false;
      }

      // Check if pool is relatively new (within 24 hours)
      const poolAge = Date.now() - poolInfo.createdAt;
      const isNewPool = poolAge < 24 * 60 * 60 * 1000;

      // For new pools, require higher liquidity
      if (isNewPool && liquiditySOL < this.minLiquiditySOL * 2) {
        return false;
      }

      // Check liquidity ratio (should be balanced)
      const liquidityRatio = Number(poolInfo.quoteReserve) / Number(poolInfo.baseReserve);
      const isBalanced = liquidityRatio > 0.001 && liquidityRatio < 1000;

      return isBalanced;
    } catch (error) {
      console.error('Error in liquidity shouldBuy:', error);
      return false;
    }
  }

  async shouldSell(position: Position, currentPrice: number): Promise<boolean> {
    try {
      if (!position.buyValue || currentPrice === 0) {
        return false;
      }

      // Calculate profit/loss percentage
      const priceChange = ((currentPrice - position.buyValue) / position.buyValue) * 100;

      // Conservative take profit
      if (priceChange >= this.takeProfitPercent) {
        return true;
      }

      // Tight stop loss for risk management
      if (priceChange <= -this.stopLossPercent) {
        return true;
      }

      // Time-based exit: sell after 1 hour if not profitable
      const holdTime = Date.now() - position.timestamp;
      const oneHour = 60 * 60 * 1000;
      
      if (holdTime > oneHour && priceChange < 5) {
        return true; // Exit if not showing good profit after 1 hour
      }

      return false;
    } catch (error) {
      console.error('Error in liquidity shouldSell:', error);
      return false;
    }
  }

  calculatePositionSize(poolInfo: PumpSwapPoolInfo): bigint {
    // Conservative position sizing based on liquidity
    // Use 0.5% of quote reserve to minimize price impact
    const positionSize = poolInfo.quoteReserve / BigInt(200);
    
    // Minimum position size (0.01 SOL)
    const minPositionSize = BigInt(10_000_000);
    
    // Maximum position size (0.5 SOL for safety)
    const maxPositionSize = BigInt(500_000_000);

    if (positionSize < minPositionSize) return minPositionSize;
    if (positionSize > maxPositionSize) return maxPositionSize;
    
    return positionSize;
  }

  /**
   * Calculate price impact for a given trade size
   */
  private calculatePriceImpact(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
      return 100; // Max impact if no liquidity
    }

    // Calculate output with constant product formula
    const amountInWithFee = amountIn * BigInt(9975); // 0.25% fee
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * BigInt(10000) + amountInWithFee;
    const amountOut = numerator / denominator;

    // Calculate price impact
    const exactQuote = (amountIn * reserveOut) / reserveIn;
    const priceImpact = Number(exactQuote - amountOut) / Number(exactQuote) * 100;

    return priceImpact;
  }
}
