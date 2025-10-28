# ⚡ Quick Start Guide - PumpSwap Trading Bot

Get your PumpSwap trading bot running in 5 minutes!

## 🎯 Prerequisites Checklist

Before starting, ensure you have:
- ✅ Node.js installed (v16+)
- ✅ A Solana wallet with private key
- ✅ SOL in your wallet (for gas fees)
- ✅ WSOL in your wallet (for trading)
- ✅ RPC endpoint (Helius, Shyft, or QuickNode)

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (1 min)
```bash
npm install
```

### Step 2: Configure Environment (2 min)
```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Minimum required settings:**
```env
PRIVATE_KEY=your_base58_private_key_here
RPC_ENDPOINT=https://your-rpc-endpoint.com
RPC_WEBSOCKET_ENDPOINT=wss://your-rpc-endpoint.com
QUOTE_MINT=WSOL
QUOTE_AMOUNT=0.01
TRADING_STRATEGY=momentum
```

### Step 3: Verify Setup (1 min)
```bash
npm run check
```

This will verify:
- ✅ Configuration is correct
- ✅ Wallet is valid
- ✅ RPC connection works
- ✅ You have sufficient balance

### Step 4: Run the Bot (1 min)
```bash
npm run pumpswap
```

You should see:
```
🚀 Initializing PumpSwap Trading Bot...
💼 Wallet Address: YourAddress...
⚙️  Configuration:
   Strategy: momentum
   Quote Token: WSOL
   Trade Amount: 0.01 WSOL
✅ Initialization complete!
🎯 Starting PumpSwap bot...
📡 Listening for new pools on PumpSwap...
```

## 🎓 First-Time User Tips

### Start Small
```env
QUOTE_AMOUNT=0.01              # Start with 0.01 SOL
MAX_CONCURRENT_POSITIONS=1     # Only 1 position at a time
```

### Use Conservative Strategy
```env
TRADING_STRATEGY=liquidity     # Most conservative
TAKE_PROFIT=30                 # Lower profit target
STOP_LOSS=20                   # Tighter stop loss
```

### Monitor Closely
- Watch the console output
- Check transaction links
- Monitor your wallet balance
- Review P&L on each trade

## 📊 Understanding the Output

### New Pool Detected
```
🆕 New pool detected
   poolId: ABC123...
```
Bot found a new PumpSwap pool.

### Buy Signal
```
🎯 Buying token...
   mint: XYZ789...
✅ Buy successful
   price: 0.00001 SOL
   signature: DEF456...
```
Bot executed a buy order.

### Position Update
```
📊 Position update
   mint: XYZ789...
   entryPrice: 0.00001
   currentPrice: 0.000012
   pnl: +20.00%
```
Current position status.

### Sell Signal
```
💰 Selling token...
   mint: XYZ789...
✅ Sell successful
   entryPrice: 0.00001
   exitPrice: 0.000015
   pnl: +50.00%
```
Bot executed a sell order.

## 🛠️ Common First-Time Issues

### Issue: "No WSOL token account found"
**Solution:**
1. Go to https://jup.ag/
2. Click "MANUAL" → Enable "Use wSOL"
3. Wrap 0.1 SOL to WSOL

### Issue: "Cannot connect to RPC"
**Solution:**
- Check your RPC_ENDPOINT is correct
- Verify your API key is valid
- Try a different RPC provider

### Issue: "Insufficient balance"
**Solution:**
- Ensure you have SOL for gas fees (keep 0.5+ SOL)
- Ensure you have WSOL for trading
- Check your QUOTE_AMOUNT isn't too high

### Issue: Bot not buying anything
**Possible reasons:**
- No new pools being created
- Strategy conditions not met
- Snipe list enabled but empty
- Minimum liquidity too high

**Solutions:**
```env
USE_SNIPE_LIST=false    # Disable snipe list
MIN_POOL_SIZE=0.1       # Lower minimum liquidity
LOG_LEVEL=debug         # Enable debug logging
```

## 🎯 Strategy Quick Reference

### Momentum (Default)
**Best for:** Trending tokens
```env
TRADING_STRATEGY=momentum
TAKE_PROFIT=50
STOP_LOSS=30
```

### Volume
**Best for:** High-activity tokens
```env
TRADING_STRATEGY=volume
TAKE_PROFIT=50
STOP_LOSS=30
MIN_POOL_SIZE=5
```

### Liquidity
**Best for:** Conservative trading
```env
TRADING_STRATEGY=liquidity
TAKE_PROFIT=30
STOP_LOSS=20
MIN_POOL_SIZE=10
```

## 📱 Quick Commands

```bash
# Check setup
npm run check

# Run PumpSwap bot
npm run pumpswap

# Run original Raydium bot
npm run buy

# Stop bot
Ctrl + C
```

## 🔍 Monitoring Your Bot

### Check Wallet Balance
```bash
# View on Solscan
https://solscan.io/account/YOUR_WALLET_ADDRESS

# View on Solana Explorer
https://explorer.solana.com/address/YOUR_WALLET_ADDRESS
```

### View Transactions
Click the transaction links in the bot output:
```
https://solscan.io/tx/SIGNATURE
```

### Track Performance
Monitor the console for:
- Number of active positions
- P&L percentages
- Buy/sell executions
- Errors or warnings

## ⚙️ Adjusting Settings On-The-Fly

### Increase Trade Size
```env
QUOTE_AMOUNT=0.1    # Increase from 0.01 to 0.1
```

### Change Strategy
```env
TRADING_STRATEGY=volume    # Switch to volume strategy
```

### Adjust Risk
```env
TAKE_PROFIT=100    # More aggressive profit target
STOP_LOSS=50       # Wider stop loss
```

**Note:** Restart the bot after changing .env

## 🎓 Learning Path

### Day 1: Learn the Basics
- Run with 0.01 SOL trades
- Watch 5-10 trades
- Understand the output
- Review transaction links

### Day 2: Test Strategies
- Try momentum strategy
- Try volume strategy
- Try liquidity strategy
- Compare results

### Day 3: Optimize Settings
- Adjust TAKE_PROFIT
- Adjust STOP_LOSS
- Adjust MIN_POOL_SIZE
- Find your sweet spot

### Day 4+: Scale Up
- Increase QUOTE_AMOUNT gradually
- Add more concurrent positions
- Use snipe list for targeted trading
- Monitor and refine

## 📚 Next Steps

Once comfortable with basics:

1. **Read Full Documentation**
   - `PUMPSWAP_README.md` - Complete guide
   - `SETUP.md` - Detailed setup
   - `PUMPSWAP_FEATURES.md` - All features

2. **Advanced Configuration**
   - Customize strategy parameters
   - Set up snipe lists
   - Optimize for your trading style

3. **Risk Management**
   - Set position size limits
   - Use stop losses consistently
   - Diversify across strategies
   - Keep detailed records

## ⚠️ Important Reminders

- 🔴 **Start small** - Test with minimal amounts first
- 🔴 **Monitor actively** - Don't leave unattended initially
- 🔴 **Keep SOL** - Always maintain SOL for gas fees
- 🔴 **Understand risk** - Only trade what you can afford to lose
- 🔴 **Stay informed** - Market conditions change rapidly

## 🆘 Getting Help

If you encounter issues:

1. Check `SETUP.md` troubleshooting section
2. Review error messages carefully
3. Enable debug logging: `LOG_LEVEL=debug`
4. Verify all configuration settings
5. Test RPC connection separately

## ✅ Pre-Flight Checklist

Before running in production:
- [ ] Tested with small amounts (0.01 SOL)
- [ ] Verified buy/sell execution
- [ ] Confirmed P&L calculations
- [ ] Tested stop loss triggers
- [ ] Tested take profit triggers
- [ ] Monitored for 1+ hour
- [ ] Comfortable with strategy behavior
- [ ] Have backup SOL for gas fees
- [ ] Understand all risks

## 🎉 You're Ready!

If you've completed the 5-minute setup and verified everything works, you're ready to start trading!

**Remember:**
- Start small
- Monitor closely
- Learn continuously
- Trade responsibly

---

**Good luck and happy trading! 🚀**

For detailed documentation, see:
- `PUMPSWAP_README.md` - Full user guide
- `SETUP.md` - Detailed setup instructions
- `PUMPSWAP_FEATURES.md` - Complete feature list
