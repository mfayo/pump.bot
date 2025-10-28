/**
 * Setup Verification Script
 * Checks if the bot is properly configured before running
 */

import * as fs from 'fs';
import * as path from 'path';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'warn', message: string) {
  results.push({ name, status, message });
}

async function checkEnvironmentFile() {
  console.log('🔍 Checking environment configuration...\n');

  // Check if .env exists
  if (!fs.existsSync('.env')) {
    addResult('Environment File', 'fail', '.env file not found. Copy .env.example to .env');
    return;
  }
  addResult('Environment File', 'pass', '.env file exists');
}

async function checkRequiredEnvVars() {
  const required = [
    'PRIVATE_KEY',
    'RPC_ENDPOINT',
    'RPC_WEBSOCKET_ENDPOINT',
    'QUOTE_MINT',
    'QUOTE_AMOUNT',
    'COMMITMENT_LEVEL',
  ];

  for (const varName of required) {
    const value = process.env[varName];
    if (!value || value.includes('XXXX')) {
      addResult(
        `Env: ${varName}`,
        'fail',
        `${varName} is not configured properly`
      );
    } else {
      addResult(`Env: ${varName}`, 'pass', 'Configured');
    }
  }
}

async function checkWallet() {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey || privateKey.includes('XXXX')) {
      addResult('Wallet', 'fail', 'Private key not configured');
      return;
    }

    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    addResult('Wallet', 'pass', `Address: ${wallet.publicKey.toString()}`);
  } catch (error) {
    addResult('Wallet', 'fail', 'Invalid private key format');
  }
}

async function checkRPCConnection() {
  try {
    const rpcEndpoint = process.env.RPC_ENDPOINT;
    if (!rpcEndpoint || rpcEndpoint.includes('XXXX')) {
      addResult('RPC Connection', 'fail', 'RPC endpoint not configured');
      return;
    }

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const version = await connection.getVersion();
    addResult('RPC Connection', 'pass', `Connected (Solana v${version['solana-core']})`);
  } catch (error) {
    addResult('RPC Connection', 'fail', 'Cannot connect to RPC endpoint');
  }
}

async function checkWalletBalance() {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const rpcEndpoint = process.env.RPC_ENDPOINT;

    if (!privateKey || !rpcEndpoint || privateKey.includes('XXXX') || rpcEndpoint.includes('XXXX')) {
      addResult('Wallet Balance', 'warn', 'Cannot check - wallet or RPC not configured');
      return;
    }

    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / 1e9;

    if (solBalance < 0.1) {
      addResult('Wallet Balance', 'warn', `Low SOL balance: ${solBalance.toFixed(4)} SOL`);
    } else {
      addResult('Wallet Balance', 'pass', `${solBalance.toFixed(4)} SOL`);
    }
  } catch (error) {
    addResult('Wallet Balance', 'warn', 'Cannot check balance');
  }
}

async function checkSnipeList() {
  const useSnipeList = process.env.USE_SNIPE_LIST === 'true';
  
  if (!useSnipeList) {
    addResult('Snipe List', 'pass', 'Disabled (will trade all tokens)');
    return;
  }

  if (!fs.existsSync('snipe-list.txt')) {
    addResult('Snipe List', 'warn', 'Enabled but snipe-list.txt not found');
    return;
  }

  const content = fs.readFileSync('snipe-list.txt', 'utf-8');
  const tokens = content.split('\n').filter(line => line.trim());
  
  if (tokens.length === 0) {
    addResult('Snipe List', 'warn', 'Enabled but snipe-list.txt is empty');
  } else {
    addResult('Snipe List', 'pass', `Enabled with ${tokens.length} token(s)`);
  }
}

async function checkTradingConfig() {
  const quoteMint = process.env.QUOTE_MINT;
  const quoteAmount = parseFloat(process.env.QUOTE_AMOUNT || '0');
  const strategy = process.env.TRADING_STRATEGY || 'momentum';

  if (!['WSOL', 'USDC'].includes(quoteMint || '')) {
    addResult('Quote Token', 'fail', 'Must be WSOL or USDC');
  } else {
    addResult('Quote Token', 'pass', quoteMint || '');
  }

  if (quoteAmount <= 0) {
    addResult('Trade Amount', 'fail', 'Must be greater than 0');
  } else if (quoteAmount < 0.01) {
    addResult('Trade Amount', 'warn', `Very small: ${quoteAmount} ${quoteMint}`);
  } else {
    addResult('Trade Amount', 'pass', `${quoteAmount} ${quoteMint}`);
  }

  if (['momentum', 'volume', 'liquidity'].includes(strategy)) {
    addResult('Trading Strategy', 'pass', strategy);
  } else {
    addResult('Trading Strategy', 'warn', `Unknown strategy: ${strategy}`);
  }
}

function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 SETUP VERIFICATION RESULTS');
  console.log('='.repeat(70) + '\n');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name.padEnd(25)} ${result.message}`);

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warnCount++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  console.log('='.repeat(70) + '\n');

  if (failCount > 0) {
    console.log('❌ Setup is incomplete. Please fix the failed checks above.\n');
    console.log('📖 See SETUP.md for detailed instructions.\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  Setup has warnings. Review them before running the bot.\n');
    console.log('✅ You can proceed, but address warnings for optimal performance.\n');
  } else {
    console.log('✅ Setup is complete! You can now run the bot.\n');
    console.log('🚀 Run: npm run pumpswap\n');
  }
}

async function main() {
  console.log('\n🔧 Solana PumpSwap Trading Bot - Setup Verification\n');

  await checkEnvironmentFile();
  await checkRequiredEnvVars();
  await checkWallet();
  await checkRPCConnection();
  await checkWalletBalance();
  await checkSnipeList();
  await checkTradingConfig();

  printResults();
}

main().catch((error) => {
  console.error('❌ Error running setup check:', error);
  process.exit(1);
});
