import { TradingStrategy, PumpSwapPoolInfo, Position } from '../pumpswap/types';
import { StrategyType } from '../pumpswap/constants';
import axios from 'axios';

/**
 * Volume-Based Trading Strategy
 * Buys tokens with high trading volume and liquidity
 * Sells based on volume decline or profit targets
 */
export class VolumeStrategy implements TradingStrategy {
  type: StrategyType = StrategyType.VOLUME;

  private readonly minVolume24h: number;
  private readonly minLiquidityUSD: number;
  private readonly takeProfitPercent: number;
  private readonly stopLossPercent: number;
  private readonly volumeDeclineThreshold: number;

  constructor(
    minVolume24h: number = 10000, // $10k minimum 24h volume
    minLiquidityUSD: number = 5000, // $5k minimum liquidity
    takeProfitPercent: number = 50,
    stopLossPercent: number = 30,
    volumeDeclineThreshold: number = 50 // 50% volume decline triggers sell
  ) {
    this.minVolume24h = minVolume24h;
    this.minLiquidityUSD = minLiquidityUSD;
    this.takeProfitPercent = takeProfitPercent;
    this.stopLossPercent = stopLossPercent;
    this.volumeDeclineThreshold = volumeDeclineThreshold;
  }

  async shouldBuy(poolInfo: PumpSwapPoolInfo): Promise<boolean> {
    try {
      const mintAddress = poolInfo.baseMint.toString();
      const tokenData = await this.fetchTokenData(mintAddress);

      if (!tokenData) {
        return false;
      }

      // Check volume requirements
      const volume24h = tokenData.volume?.h24 || 0;
      if (volume24h < this.minVolume24h) {
        return false;
      }

      // Check liquidity requirements
      const liquidityUSD = tokenData.liquidity?.usd || 0;
      if (liquidityUSD < this.minLiquidityUSD) {
        return false;
      }

      // Check for increasing volume trend
      const volume1h = tokenData.volume?.h1 || 0;
      const volume6h = tokenData.volume?.h6 || 0;

      // Volume should be increasing (1h > average of 6h)
      const avgHourlyVolume6h = volume6h / 6;
      const isVolumeIncreasing = volume1h > avgHourlyVolume6h * 1.5;

      // Check for positive price action
      const priceChange1h = tokenData.priceChange?.h1 || 0;
      const isPricePositive = priceChange1h > 0;

      return isVolumeIncreasing && isPricePositive;
    } catch (error) {
      console.error('Error in volume shouldBuy:', error);
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
        return true;
      }

      if (priceChange <= -this.stopLossPercent) {
        return true;
      }

      // Check volume decline
      const mintAddress = position.mint.toString();
      const tokenData = await this.fetchTokenData(mintAddress);

      if (tokenData) {
        const volume1h = tokenData.volume?.h1 || 0;
        const volume6h = tokenData.volume?.h6 || 0;
        const avgHourlyVolume6h = volume6h / 6;

        // If current volume dropped significantly, sell
        if (volume1h < avgHourlyVolume6h * (1 - this.volumeDeclineThreshold / 100)) {
          return true;
        }

        // If price is declining with volume, sell
        const priceChange1h = tokenData.priceChange?.h1 || 0;
        if (priceChange1h < -5 && volume1h > avgHourlyVolume6h) {
          return true; // High volume sell-off
        }
      }

      return false;
    } catch (error) {
      console.error('Error in volume shouldSell:', error);
      return false;
    }
  }

  calculatePositionSize(poolInfo: PumpSwapPoolInfo): bigint {
    // Calculate position size based on liquidity
    // Use 2% of quote reserve for high liquidity pools
    const positionSize = poolInfo.quoteReserve / BigInt(50);
    
    // Minimum position size (0.01 SOL)
    const minPositionSize = BigInt(10_000_000);
    
    // Maximum position size (1 SOL)
    const maxPositionSize = BigInt(1_000_000_000);

    if (positionSize < minPositionSize) return minPositionSize;
    if (positionSize > maxPositionSize) return maxPositionSize;
    
    return positionSize;
  }

  private async fetchTokenData(mintAddress: string): Promise<any> {
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
      const response = await axios.get(url);
      
      if (response.data.pairs && response.data.pairs.length > 0) {
        return response.data.pairs.find((pair: any) => pair.chainId === 'solana');
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}
