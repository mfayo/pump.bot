import { TradingStrategy, PumpSwapPoolInfo, Position } from '../pumpswap/types';
import { StrategyType } from '../pumpswap/constants';
import { MomentumStrategy } from './momentum';
import { VolumeStrategy } from './volume';
import { LiquidityStrategy } from './liquidity';
import { Logger } from 'pino';

/**
 * Strategy Manager
 * Manages multiple trading strategies and coordinates their execution
 */
export class StrategyManager {
  private strategies: Map<StrategyType, TradingStrategy> = new Map();
  private activeStrategy: StrategyType;
  private logger: Logger;

  constructor(logger: Logger, initialStrategy: StrategyType = StrategyType.MOMENTUM) {
    this.logger = logger;
    this.activeStrategy = initialStrategy;
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Initialize all available strategies
    this.strategies.set(StrategyType.MOMENTUM, new MomentumStrategy());
    this.strategies.set(StrategyType.VOLUME, new VolumeStrategy());
    this.strategies.set(StrategyType.LIQUIDITY, new LiquidityStrategy());
  }

  /**
   * Set the active trading strategy
   */
  setActiveStrategy(strategyType: StrategyType): void {
    if (this.strategies.has(strategyType)) {
      this.activeStrategy = strategyType;
      this.logger.info({ strategy: strategyType }, 'Active strategy changed');
    } else {
      this.logger.warn({ strategy: strategyType }, 'Strategy not found');
    }
  }

  /**
   * Get the current active strategy
   */
  getActiveStrategy(): TradingStrategy | undefined {
    return this.strategies.get(this.activeStrategy);
  }

  /**
   * Evaluate if should buy using active strategy
   */
  async shouldBuy(poolInfo: PumpSwapPoolInfo): Promise<boolean> {
    const strategy = this.getActiveStrategy();
    if (!strategy) {
      this.logger.error('No active strategy found');
      return false;
    }

    try {
      const decision = await strategy.shouldBuy(poolInfo);
      this.logger.debug(
        {
          strategy: this.activeStrategy,
          mint: poolInfo.baseMint.toString(),
          decision,
        },
        'Buy decision evaluated'
      );
      return decision;
    } catch (error) {
      this.logger.error({ error, strategy: this.activeStrategy }, 'Error evaluating buy decision');
      return false;
    }
  }

  /**
   * Evaluate if should sell using active strategy
   */
  async shouldSell(position: Position, currentPrice: number): Promise<boolean> {
    const strategy = this.getActiveStrategy();
    if (!strategy) {
      this.logger.error('No active strategy found');
      return false;
    }

    try {
      const decision = await strategy.shouldSell(position, currentPrice);
      this.logger.debug(
        {
          strategy: this.activeStrategy,
          mint: position.mint.toString(),
          currentPrice,
          entryPrice: position.entryPrice,
          decision,
        },
        'Sell decision evaluated'
      );
      return decision;
    } catch (error) {
      this.logger.error({ error, strategy: this.activeStrategy }, 'Error evaluating sell decision');
      return false;
    }
  }

  /**
   * Calculate position size using active strategy
   */
  calculatePositionSize(poolInfo: PumpSwapPoolInfo): bigint {
    const strategy = this.getActiveStrategy();
    if (!strategy) {
      this.logger.error('No active strategy found');
      return BigInt(10_000_000); // Default 0.01 SOL
    }

    try {
      const size = strategy.calculatePositionSize(poolInfo);
      this.logger.debug(
        {
          strategy: this.activeStrategy,
          mint: poolInfo.baseMint.toString(),
          size: size.toString(),
        },
        'Position size calculated'
      );
      return size;
    } catch (error) {
      this.logger.error({ error, strategy: this.activeStrategy }, 'Error calculating position size');
      return BigInt(10_000_000); // Default 0.01 SOL
    }
  }

  /**
   * Add a custom strategy
   */
  addCustomStrategy(strategy: TradingStrategy): void {
    this.strategies.set(strategy.type, strategy);
    this.logger.info({ strategy: strategy.type }, 'Custom strategy added');
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): StrategyType[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get strategy statistics
   */
  getStrategyStats(): { [key: string]: any } {
    return {
      activeStrategy: this.activeStrategy,
      availableStrategies: this.getAvailableStrategies(),
      totalStrategies: this.strategies.size,
    };
  }
}
