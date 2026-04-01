#!/usr/bin/env node

import { Command } from 'commander';
import { setupWallet } from './commands/setup.js';
import { statusWallet } from './commands/status.js';
import { fundWallet } from './commands/fund.js';
import { providers } from './commands/providers.js';
import { balanceCommand } from './commands/balance.js';
import { backupWallet } from './commands/backup.js';
import { recoverWallet } from './commands/recover.js';
import { schemaCommand } from './commands/schema.js';
import { isJsonMode } from './utils/output.js';

const program = new Command();

program
  .name('agent-wallet')
  .description('CLI for agents to create and manage wallets via Coinbase, Tempo (Stripe), OpenWallet (Moonpay), or Crossmint providers. Agent Arena NEVER stores your keys.')
  .version('1.0.2');

program
  .command('setup')
  .description('Set up a new wallet with your chosen provider')
  .option('-p, --provider <provider>', 'Wallet provider: coinbase, tempo, openwallet, or crossmint')
  .option('-c, --chain <chain>', 'Target chain: base, ethereum, arbitrum, optimism, polygon (default: base)')
  .option('-n, --name <name>', 'Wallet name for openwallet provider (default: "default")')
  .option('--password-file <path>', 'Path to file containing encryption password (for non-interactive mode)')
  .option('--non-interactive', 'Run without prompts (requires --password-file for openwallet)')
  .option('--json', 'Output as JSON for programmatic use')
  .action(setupWallet);

program
  .command('balance')
  .description('Check wallet balances across all providers')
  .option('-a, --all', 'Check all providers at once')
  .option('-p, --provider <provider>', 'Check specific provider: coinbase, tempo, openwallet, or crossmint')
  .option('--json', 'Output as JSON for programmatic use')
  .option('--fields <fields>', 'Comma-separated fields to include (e.g. address,balanceUSDC)')
  .action(balanceCommand);

program
  .command('status')
  .description('Check wallet authentication status')
  .option('-p, --provider <provider>', 'Wallet provider to check')
  .option('--json', 'Output as JSON for programmatic use')
  .action(statusWallet);

program
  .command('fund')
  .description('Get instructions to fund your wallet')
  .option('-p, --provider <provider>', 'Wallet provider')
  .option('--json', 'Output as JSON for programmatic use')
  .action(fundWallet);

program
  .command('backup')
  .description('Backup an OpenWallet to encrypted file')
  .option('-n, --name <name>', 'Wallet name to backup (default: "default")')
  .option('-o, --output <path>', 'Output directory for backup file')
  .option('--password-file <path>', 'Path to file containing encryption password')
  .option('--json', 'Output as JSON for programmatic use')
  .action(backupWallet);

program
  .command('recover')
  .description('Recover an OpenWallet from backup or seed phrase')
  .option('--from <path>', 'Path to backup file')
  .option('--seed-phrase', 'Recover from 12-word seed phrase')
  .option('-n, --name <name>', 'Name for recovered wallet (default: "recovered")')
  .option('--password-file <path>', 'Path to file containing encryption password')
  .option('--json', 'Output as JSON for programmatic use')
  .action(recoverWallet);

program
  .command('providers')
  .description('List available wallet providers and their features')
  .option('--json', 'Output as JSON for programmatic use')
  .action(providers);

program
  .command('schema')
  .description('Show machine-readable schema for a command')
  .argument('[command]', 'Command to show schema for (omit for all)')
  .action(schemaCommand);

program.parse();
