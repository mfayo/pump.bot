# Setup Guide for Solana PumpSwap Trading Bot

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- @solana/web3.js
- @solana/spl-token
- @raydium-io/raydium-sdk
- TypeScript and related tools
- Logging utilities (pino)
- And more...

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit the `.env` file with your settings:

**Required Configuration:**
- `PRIVATE_KEY` - Your wallet's private key (base58 encoded)
- `RPC_ENDPOINT` - Your Solana RPC endpoint URL
- `RPC_WEBSOCKET_ENDPOINT` - Your Solana WebSocket endpoint URL

**Trading Configuration:**
- `QUOTE_MINT` - Token to trade with (WSOL or USDC)
- `QUOTE_AMOUNT` - Amount per trade (e.g., 0.1)
- `TRADING_STRATEGY` - Strategy to use (momentum, volume, or liquidity)

### 3. Prepare Your Wallet

**Important:** You need both SOL and WSOL in your wallet.

1. **Get SOL** - Ensure you have SOL for gas fees (recommended: 1-2 SOL)
2. **Convert to WSOL** - Use [Jupiter](https://jup.ag/) to wrap SOL to WSOL
   - Go to Jupiter
   - Click "MANUAL" and enable "Use wSOL"
   - Convert desired amount (e.g., 0.5 SOL to WSOL)

### 4. Verify Setup

Check that TypeScript compiles without errors:

```bash
npx tsc --noEmit
```

If you see errors, review the error messages and ensure all dependencies are installed.

### 5. Run the Bot

**For PumpSwap Trading:**
```bash
npm run pumpswap
```

**For Raydium/PumpFun Trading:**
```bash
npm run buy
```

## Project Structure

```
.
├── pumpswap/              # PumpSwap integration
│   ├── constants.ts       # Configuration constants
│   ├── types.ts          # TypeScript type definitions
│   ├── pumpswap.ts       # Core PumpSwap client
│   └── index.ts          # Module exports
│
├── strategies/            # Trading strategies
│   ├── momentum.ts       # Momentum-based strategy
│   ├── volume.ts         # Volume-based strategy
│   ├── liquidity.ts      # Liquidity-based strategy
│   ├── strategy-manager.ts # Strategy orchestration
│   └── index.ts          # Module exports
│
├── pumpswap-bot.ts       # Main PumpSwap bot entry point
├── buy.ts                # Original Raydium/PumpFun bot
│
├── liquidity/            # Liquidity utilities
├── market/               # Market data utilities
├── types/                # Type definitions
├── utils/                # Helper utilities
├── constants/            # Global constants
│
├── .env.example          # Environment template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── README.md             # Original README
├── PUMPSWAP_README.md    # PumpSwap bot documentation
└── SETUP.md              # This file
```

## Available Scripts

- `npm run buy` - Run the original Raydium/PumpFun sniper bot
- `npm run pumpswap` - Run the PumpSwap trading bot

## Configuration Files

### .env
Main configuration file with all bot settings. Copy from `.env.example` and customize.

### snipe-list.txt
List of token mint addresses to target (one per line). Only used when `USE_SNIPE_LIST=true`.

## Testing

### Test with Small Amounts

**Important:** Always test with small amounts first!

1. Set `QUOTE_AMOUNT=0.01` in `.env`
2. Set `MAX_CONCURRENT_POSITIONS=1`
3. Run the bot and monitor behavior
4. Gradually increase amounts after successful testing

### Monitor Logs

The bot provides detailed logging:
- 🆕 New pool detections
- 🎯 Buy signals and transactions
- 💰 Sell signals and transactions
- 📊 Position updates
- ⚠️ Warnings and errors

### Debug Mode

For detailed debugging, set in `.env`:
```env
LOG_LEVEL=debug
```

## Troubleshooting

### "No WSOL token account found"

**Solution:** You need to wrap SOL to WSOL first.
1. Go to https://jup.ag/
2. Click "MANUAL" and enable "Use wSOL"
3. Wrap some SOL to WSOL

### "Failed to fetch pool info"

**Solution:** Check your RPC endpoint.
- Ensure RPC_ENDPOINT and RPC_WEBSOCKET_ENDPOINT are correct
- Try a different RPC provider (Helius, Shyft, QuickNode)
- Verify your API key is valid

### TypeScript Compilation Errors

**Solution:** Ensure all dependencies are installed.
```bash
rm -rf node_modules package-lock.json
npm install
```

### Transaction Failures

**Solution:** Adjust slippage and amount.
- Increase `MAX_SLIPPAGE_BPS` (e.g., 1000 for 10%)
- Decrease `QUOTE_AMOUNT`
- Ensure sufficient SOL for gas fees

## RPC Providers

Recommended RPC providers for best performance:

1. **Helius** - https://helius.dev/
   - Fast and reliable
   - Good free tier
   - Excellent WebSocket support

2. **Shyft** - https://shyft.to/
   - Easy to use
   - Good documentation
   - Reliable service

3. **QuickNode** - https://quicknode.com/
   - Premium performance
   - Advanced features
   - Professional support

## Security Best Practices

1. **Never share your private key**
2. **Use a dedicated trading wallet**
3. **Keep `.env` file secure** (never commit to git)
4. **Start with small amounts**
5. **Monitor bot activity regularly**
6. **Keep sufficient SOL for gas fees**
7. **Use strong RPC endpoints**

## Performance Optimization

1. **Use Premium RPC** - Faster execution and better reliability
2. **Optimize Strategy** - Test different strategies with your trading style
3. **Adjust Position Sizing** - Based on your risk tolerance
4. **Monitor Gas Fees** - Keep extra SOL for transaction costs
5. **Use Snipe List** - Focus on researched tokens

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Configure `.env` file
3. ✅ Prepare wallet (SOL + WSOL)
4. ✅ Test compilation (`npx tsc --noEmit`)
5. ✅ Run bot with small amounts
6. ✅ Monitor and adjust settings
7. ✅ Scale up gradually

## Support

For detailed documentation, see:
- `README.md` - Original bot documentation
- `PUMPSWAP_README.md` - PumpSwap bot guide

## Disclaimer

This software is provided for educational purposes only. Trading cryptocurrencies involves significant risk. Only trade with funds you can afford to lose. The developers are not responsible for any financial losses incurred while using this software.

---

**Ready to start?** Run `npm install` and then configure your `.env` file!
