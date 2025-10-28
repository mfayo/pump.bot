# 🚀 Solana PumpSwap Trading Bot

A sophisticated automated trading bot for PumpSwap DEX on Solana blockchain with multiple trading strategies, real-time monitoring, and advanced risk management.

## ✨ Features

### Core Features
- 🎯 **Real-time Pool Monitoring** - WebSocket-based detection of new PumpSwap pools
- 💰 **Automated Trading** - Auto-buy and auto-sell with configurable parameters
- 📊 **Multiple Trading Strategies**:
  - **Momentum Strategy** - Trades based on price momentum and trends
  - **Volume Strategy** - Focuses on high-volume tokens with strong liquidity
  - **Liquidity Strategy** - Conservative approach prioritizing stable, liquid pools
- 🛡️ **Risk Management** - Take profit, stop loss, and position sizing
- 📋 **Snipe List Support** - Target specific tokens for trading
- 🔄 **Concurrent Position Management** - Handle multiple positions simultaneously
- 📈 **Real-time Price Tracking** - Monitor positions with live price updates

### Safety Features
- ✅ Minimum liquidity checks
- ✅ Slippage protection
- ✅ Maximum position limits
- ✅ Configurable risk parameters
- ✅ Comprehensive error handling

## 📋 Prerequisites

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **Solana Wallet** with private key
3. **SOL & WSOL** in your wallet for trading and gas fees
4. **RPC Endpoint** - Recommended: Helius, Shyft, or QuickNode

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd solana-sniper-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration (see Configuration section below).

## ⚙️ Configuration

### Required Settings

```env
# Wallet Configuration
PRIVATE_KEY=your_wallet_private_key_in_base58

# RPC Configuration
RPC_ENDPOINT=https://rpc.shyft.to?api_key=YOUR_API_KEY
RPC_WEBSOCKET_ENDPOINT=wss://rpc.shyft.to?api_key=YOUR_API_KEY

# Trading Configuration
QUOTE_MINT=WSOL                    # Quote token (WSOL or USDC)
QUOTE_AMOUNT=0.1                   # Amount to trade per transaction
COMMITMENT_LEVEL=finalized         # Transaction commitment level

# PumpSwap Bot Settings
TRADING_STRATEGY=momentum          # Strategy: momentum, volume, or liquidity
MAX_CONCURRENT_POSITIONS=5         # Maximum simultaneous positions
MIN_POOL_SIZE=1                    # Minimum pool liquidity in SOL
MAX_SLIPPAGE_BPS=500              # Maximum slippage (500 = 5%)

# Auto-Sell Configuration
AUTO_SELL=true                     # Enable automatic selling
TAKE_PROFIT=50                     # Take profit at 50% gain
STOP_LOSS=30                       # Stop loss at 30% loss

# Snipe List (Optional)
USE_SNIPE_LIST=false              # Enable snipe list mode
SNIPE_LIST_REFRESH_INTERVAL=20000 # Refresh interval in ms

# API Keys
BIRDEYE_API_KEY=your_birdeye_api_key
```

### Trading Strategies

#### 1. Momentum Strategy (`momentum`)
- **Best for**: Trending tokens with strong price action
- **Characteristics**:
  - Buys tokens showing 10%+ price increase
  - Monitors price momentum over time
  - Sells on momentum reversal or profit targets
- **Risk Level**: Medium-High
- **Recommended Settings**:
  ```env
  TRADING_STRATEGY=momentum
  TAKE_PROFIT=50
  STOP_LOSS=30
  ```

#### 2. Volume Strategy (`volume`)
- **Best for**: High-volume tokens with strong market activity
- **Characteristics**:
  - Requires minimum $10k 24h volume
  - Focuses on liquidity and trading activity
  - Sells on volume decline
- **Risk Level**: Medium
- **Recommended Settings**:
  ```env
  TRADING_STRATEGY=volume
  TAKE_PROFIT=50
  STOP_LOSS=30
  MIN_POOL_SIZE=5
  ```

#### 3. Liquidity Strategy (`liquidity`)
- **Best for**: Conservative trading with stable pools
- **Characteristics**:
  - Requires minimum 10 SOL liquidity
  - Low price impact trades
  - Conservative profit targets
- **Risk Level**: Low-Medium
- **Recommended Settings**:
  ```env
  TRADING_STRATEGY=liquidity
  TAKE_PROFIT=30
  STOP_LOSS=20
  MIN_POOL_SIZE=10
  ```

## 🚀 Usage

### Start the PumpSwap Bot

```bash
npm run pumpswap
```

### Start the Original Raydium/PumpFun Bot

```bash
npm run buy
```

### Bot Output

The bot will display:
- 🆕 New pool detections
- 🎯 Buy signals and executions
- 💰 Sell signals and executions
- 📊 Position updates with P&L
- ⚠️ Warnings and errors

Example output:
```
🚀 Initializing PumpSwap Trading Bot...
💼 Wallet Address: YourWalletAddress...
⚙️  Configuration:
   Strategy: momentum
   Quote Token: WSOL
   Trade Amount: 0.1 WSOL
   Min Pool Size: 1 WSOL
   Auto Sell: true
✅ Initialization complete!
🎯 Starting PumpSwap bot...
📡 Listening for new pools on PumpSwap...
🆕 New pool detected
🎯 Buying token...
✅ Buy successful
💰 Selling token...
✅ Sell successful - PnL: +45.2%
```

## 📊 Monitoring & Management

### Position Monitoring

The bot automatically monitors all active positions every 5 seconds:
- Tracks current price vs entry price
- Calculates real-time P&L
- Evaluates sell conditions based on strategy
- Executes sells when conditions are met

### Snipe List Mode

To trade only specific tokens:

1. Enable snipe list in `.env`:
```env
USE_SNIPE_LIST=true
```

2. Add token addresses to `snipe-list.txt` (one per line):
```
TokenMintAddress1
TokenMintAddress2
TokenMintAddress3
```

3. The bot will only trade tokens in this list

## 🛡️ Risk Management

### Position Sizing

Position sizes are automatically calculated based on:
- Pool liquidity
- Selected strategy
- Configured limits

### Safety Limits

```env
MAX_CONCURRENT_POSITIONS=5    # Limit simultaneous positions
MIN_POOL_SIZE=1              # Minimum liquidity requirement
MAX_SLIPPAGE_BPS=500         # Maximum acceptable slippage
```

### Stop Loss & Take Profit

```env
TAKE_PROFIT=50    # Exit at 50% profit
STOP_LOSS=30      # Exit at 30% loss
```

## 🔍 Troubleshooting

### Common Issues

**1. "No WSOL token account found"**
- Solution: Convert SOL to WSOL using [Jupiter](https://jup.ag/)

**2. "Failed to fetch pool info"**
- Solution: Check RPC endpoint is working and has WebSocket support

**3. "Insufficient liquidity"**
- Solution: Lower `MIN_POOL_SIZE` or wait for more liquid pools

**4. Transaction failures**
- Solution: Increase `MAX_SLIPPAGE_BPS` or reduce `QUOTE_AMOUNT`

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
```

## 📈 Performance Tips

1. **Use Premium RPC** - Helius, Shyft, or QuickNode for faster execution
2. **Optimize Strategy** - Test different strategies with small amounts
3. **Monitor Gas Fees** - Keep extra SOL for transaction fees
4. **Adjust Position Size** - Start small and scale up
5. **Use Snipe List** - Focus on researched tokens for better results

## ⚠️ Important Notes

- **Test First**: Start with small amounts to test the bot
- **Monitor Actively**: Keep an eye on bot performance initially
- **Gas Fees**: Maintain sufficient SOL for transaction fees
- **Market Risk**: Crypto trading involves significant risk
- **No Guarantees**: Past performance doesn't guarantee future results

## 🔐 Security

- Never share your private key
- Use environment variables for sensitive data
- Keep your `.env` file secure and never commit it
- Consider using a dedicated trading wallet

## 📝 License

This project is provided as-is for educational purposes.

## 🤝 Support

For issues and questions:
- Check the troubleshooting section
- Review logs for error messages
- Ensure all configuration is correct

## ⚡ Advanced Configuration

### Custom Strategy Parameters

You can modify strategy parameters in the code:

**Momentum Strategy** (`strategies/momentum.ts`):
```typescript
new MomentumStrategy(
  10,  // momentumThreshold (10% increase)
  5,   // lookbackPeriod (5 data points)
  50,  // takeProfitPercent
  30   // stopLossPercent
)
```

**Volume Strategy** (`strategies/volume.ts`):
```typescript
new VolumeStrategy(
  10000,  // minVolume24h ($10k)
  5000,   // minLiquidityUSD ($5k)
  50,     // takeProfitPercent
  30,     // stopLossPercent
  50      // volumeDeclineThreshold (50%)
)
```

**Liquidity Strategy** (`strategies/liquidity.ts`):
```typescript
new LiquidityStrategy(
  10,  // minLiquiditySOL (10 SOL)
  2,   // maxPriceImpact (2%)
  30,  // takeProfitPercent
  20,  // stopLossPercent
  20   // liquidityGrowthThreshold (20%)
)
```

## 🎯 Roadmap

- [ ] Web dashboard for monitoring
- [ ] Telegram notifications
- [ ] Backtesting framework
- [ ] Multi-DEX support
- [ ] Advanced analytics
- [ ] Portfolio management

---

**Disclaimer**: This bot is for educational purposes. Trading cryptocurrencies carries risk. Only trade with funds you can afford to lose. The developers are not responsible for any financial losses.
