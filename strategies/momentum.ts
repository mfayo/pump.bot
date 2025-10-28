import { TradingStrategy, PumpSwapPoolInfo, Position } from '../pumpswap/types';
import { StrategyType } from '../pumpswap/constants';
import { retrieveTokenValueByAddress } from '../utils';

/**
 * Momentum Trading Strategy
 * Buys tokens showing strong upward price momentum
 * Sells when momentum reverses or targets are hit
 */
export class MomentumStrategy implements TradingStrategy {
  type: StrategyType = StrategyType.MOMENTUM;
  
  private priceHistory: Map<string, number[]> = new Map();
  private readonly momentumThreshold: number;
  private readonly lookbackPeriod: number;
  private readonly takeProfitPercent: number;
  private readonly stopLossPercent: number;

  constructor(
    momentumThreshold: number = 10, // 10% price increase
    lookbackPeriod: number = 5, // Last 5 price points
    takeProfitPercent: number = 50,
    stopLossPercent: number = 30
  ) {
    this.momentumThreshold = momentumThreshold;
    this.lookbackPeriod = lookbackPeriod;
    this.takeProfitPercent = takeProfitPercent;
    this.stopLossPercent = stopLossPercent;
  }

  async shouldBuy(poolInfo: PumpSwapPoolInfo): Promise<boolean> {
    try {
      const mintAddress = poolInfo.baseMint.toString();
      const currentPrice = await retrieveTokenValueByAddress(mintAddress);

      if (!currentPrice) {
        return false;
      }

      // Get or initialize price history
      let history = this.priceHistory.get(mintAddress) || [];
      history.push(currentPrice);

      // Keep only recent history
      if (history.length > this.lookbackPeriod) {
        history = history.slice(-this.lookbackPeriod);
      }

      this.priceHistory.set(mintAddress, history);

      // Need at least 2 data points to calculate momentum
      if (history.length < 2) {
        return false;
      }

      // Calculate momentum (percentage change from oldest to newest)
      const oldestPrice = history[0];
      const momentum = ((currentPrice - oldestPrice) / oldestPrice) * 100;

      // Check if momentum exceeds threshold
      if (momentum >= this.momentumThreshold) {
        // Additional check: ensure recent trend is still upward
        const recentPrice = history[history.length - 2];
        const recentMomentum = ((currentPrice - recentPrice) / recentPrice) * 100;

        return recentMomentum > 0;
      }

      return false;
    } catch (error) {
      console.error('Error in momentum shouldBuy:', error);
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

      // Sell if take profit or stop loss is hit
      if (priceChange >= this.takeProfitPercent) {
        return true; // Take profit
      }

      if (priceChange <= -this.stopLossPercent) {
        return true; // Stop loss
      }

      // Check for momentum reversal
      const mintAddress = position.mint.toString();
      const history = this.priceHistory.get(mintAddress) || [];

      if (history.length >= 3) {
        // Check if last 3 prices show downward trend
        const isDowntrend = history.slice(-3).every((price, idx, arr) => {
          return idx === 0 || price < arr[idx - 1];
        });

        if (isDowntrend && priceChange > 0) {
          // Momentum reversed but still in profit - sell to lock gains
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error in momentum shouldSell:', error);
      return false;
    }
  }

  calculatePositionSize(poolInfo: PumpSwapPoolInfo): bigint {
    // Calculate position size based on pool liquidity
    // Use 1% of quote reserve as max position size
    const maxPositionSize = poolInfo.quoteReserve / BigInt(100);
    
    // Minimum position size (0.01 SOL in lamports)
    const minPositionSize = BigInt(10_000_000);

    return maxPositionSize > minPositionSize ? maxPositionSize : minPositionSize;
  }

  clearHistory(mintAddress: string): void {
    this.priceHistory.delete(mintAddress);
  }
}
