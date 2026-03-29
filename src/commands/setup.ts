import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { v4 as uuidv4 } from 'uuid';
import {
  walletExists,
  saveWalletExclusive,
  encryptPrivateKey,
  validateWalletName,
  safePasswordEqual,
  CHAIN_CONFIG,
  type StoredWallet
} from '../utils/storage.js';
import { isJsonMode, jsonOut, jsonError, ExitCode } from '../utils/output.js';

interface SetupOptions {
  provider?: string;
  chain?: string;
  name?: string;
  passwordFile?: string;
  nonInteractive?: boolean;
  json?: boolean;
}

const PROVIDERS = ['coinbase', 'tempo', 'openwallet'] as const;
type Provider = typeof PROVIDERS[number];

export async function setupWallet(options: SetupOptions): Promise<void> {
  const useJson = isJsonMode(options);
  let { provider, chain = 'base', name = 'default', passwordFile, nonInteractive } = options;

  if (!useJson) {
    console.log();
    console.log(chalk.bold('🔐 Agent Wallet Setup'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log(chalk.white('Agent Arena does NOT store your keys.'));
    console.log(chalk.white('All wallet data stays on YOUR machine or with YOUR provider.'));
    console.log();
  }

  // Non-interactive mode validation
  if (nonInteractive) {
    if (!provider) {
      if (useJson) jsonError(ExitCode.INVALID_INPUT, '--provider is required in non-interactive mode');
      console.error(chalk.red('✗ --provider is required in non-interactive mode'));
      process.exit(ExitCode.INVALID_INPUT);
    }
    if (provider === 'openwallet' && !passwordFile) {
      if (useJson) jsonError(ExitCode.INVALID_INPUT, '--password-file is required for openwallet in non-interactive mode');
      console.error(chalk.red('✗ --password-file is required for openwallet in non-interactive mode'));
      process.exit(ExitCode.INVALID_INPUT);
    }
  }

  // Provider selection if not specified
  if (!provider) {
    if (useJson) jsonError(ExitCode.INVALID_INPUT, '--provider is required in JSON/piped mode');
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select wallet provider:',
        choices: [
          {
            name: 'Coinbase Agentic Wallet (Coinbase) — Managed, compliant, x402 native',
            value: 'coinbase'
          },
          {
            name: 'Tempo Wallet (Stripe) — Fast payments, service discovery, passkey auth',
            value: 'tempo'
          },
          {
            name: 'OpenWallet Standard (Moonpay) — Self-custody, policy-gated signing',
            value: 'openwallet'
          }
        ]
      }
    ]);
    provider = answers.provider;
  }

  // Validate provider
  if (!PROVIDERS.includes(provider as Provider)) {
    if (useJson) jsonError(ExitCode.INVALID_INPUT, `Unknown provider: ${provider}`, { validProviders: [...PROVIDERS] });
    console.error(chalk.red(`✗ Unknown provider: ${provider}`));
    console.log(chalk.gray(`Valid providers: ${PROVIDERS.join(', ')}`));
    process.exit(ExitCode.INVALID_INPUT);
  }

  if (!useJson) {
    console.log();
    console.log(chalk.cyan(`Setting up ${provider} wallet...`));
    console.log();
  }

  switch (provider) {
    case 'coinbase':
      await setupCoinbase(useJson);
      break;
    case 'tempo':
      await setupTempo(useJson);
      break;
    case 'openwallet':
      await setupOpenWallet(name, chain, useJson, passwordFile, nonInteractive);
      break;
  }
}

async function setupCoinbase(useJson: boolean): Promise<void> {
  if (!useJson) {
    console.log(chalk.bold('Coinbase Agentic Wallet Setup'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log('This will use the Coinbase awal CLI to create your wallet.');
    console.log('Your keys are stored in Coinbase infrastructure — never on Agent Arena servers.');
    console.log();
  }

  // Check if awal is available
  const spinner = useJson ? null : ora('Checking for Coinbase awal CLI...').start();

  try {
    execSync('npx awal --version', { stdio: 'pipe' });
    spinner?.succeed('Coinbase awal CLI available');
  } catch {
    spinner?.info('Installing Coinbase awal skills...');
    if (useJson) {
      jsonError(ExitCode.PROVIDER_NOT_INSTALLED, 'Coinbase awal CLI not installed', {
        installCommand: 'npx skills add coinbase/agentic-wallet-skills'
      });
    }
    console.log();
    console.log(chalk.yellow('Run the following command to install:'));
    console.log();
    console.log(chalk.white('  npx skills add coinbase/agentic-wallet-skills'));
    console.log();
    console.log(chalk.gray('After installation, authenticate with:'));
    console.log(chalk.white('  npx awal auth login your-email@example.com'));
    console.log();
    process.exit(ExitCode.PROVIDER_NOT_INSTALLED);
    return;
  }

  // Prompt for email
  const { email } = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Enter your email for Coinbase authentication:',
      validate: (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) || 'Please enter a valid email';
      }
    }
  ]);

  if (!useJson) {
    console.log();
    console.log(chalk.cyan('Starting Coinbase authentication...'));
    console.log(chalk.gray('You will receive a 6-digit OTP via email.'));
    console.log();
  }

  // Run awal auth login
  try {
    const child = spawn('npx', ['awal', 'auth', 'login', email], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (useJson) {
          jsonOut({ ok: true, provider: 'coinbase', email, message: 'OTP sent. Run: npx awal auth verify <flowId> <otp>' });
        } else {
          console.log();
          console.log(chalk.green('✓ Coinbase wallet setup initiated!'));
          console.log();
          console.log(chalk.bold('Next steps:'));
          console.log('  1. Check your email for the OTP');
          console.log('  2. Run: npx awal auth verify <flowId> <otp>');
          console.log('  3. Check status: npx awal status');
          console.log('  4. Get address: npx awal address');
        }
      }
    });
  } catch (error) {
    if (useJson) jsonError(ExitCode.GENERAL_ERROR, 'Failed to start Coinbase authentication');
    console.error(chalk.red('Failed to start Coinbase authentication'));
    console.error(error);
  }
}

async function setupTempo(useJson: boolean): Promise<void> {
  if (!useJson) {
    console.log(chalk.bold('Tempo Wallet Setup'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log('This will use the Tempo CLI to create your wallet.');
    console.log('Your keys are stored locally with passkey authentication.');
    console.log();
  }

  const spinner = useJson ? null : ora('Checking for Tempo CLI...').start();

  // Check if tempo is installed
  let tempoPath = '';
  try {
    execSync('which tempo', { stdio: 'pipe' });
    tempoPath = 'tempo';
    spinner?.succeed('Tempo CLI found');
  } catch {
    try {
      execSync('test -f "$HOME/.tempo/bin/tempo"', { stdio: 'pipe' });
      tempoPath = '"$HOME/.tempo/bin/tempo"';
      spinner?.succeed('Tempo CLI found at ~/.tempo/bin/tempo');
    } catch {
      spinner?.info('Tempo CLI not found. Installing...');
      if (useJson) {
        jsonError(ExitCode.PROVIDER_NOT_INSTALLED, 'Tempo CLI not installed', {
          installCommand: 'curl -fsSL https://tempo.xyz/install | bash'
        });
      }
      console.log();
      console.log(chalk.yellow('Run the following command to install Tempo:'));
      console.log();
      console.log(chalk.white('  curl -fsSL https://tempo.xyz/install | bash'));
      console.log();
      process.exit(ExitCode.PROVIDER_NOT_INSTALLED);
      return;
    }
  }

  if (!useJson) {
    console.log();
    console.log(chalk.cyan('Starting Tempo wallet login...'));
    console.log(chalk.yellow('⚠ This will open a browser for passkey authentication.'));
    console.log(chalk.gray('  (This may take up to 16 minutes for agent workflows)'));
    console.log();
  }

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Ready to open browser for authentication?',
      default: true
    }
  ]);

  if (!proceed) {
    if (useJson) jsonOut({ ok: false, provider: 'tempo', message: 'Setup cancelled by user' });
    else console.log(chalk.gray('Setup cancelled.'));
    return;
  }

  try {
    const child = spawn(tempoPath, ['wallet', 'login'], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (useJson) {
          jsonOut({ ok: true, provider: 'tempo', message: 'Tempo wallet setup complete' });
        } else {
          console.log();
          console.log(chalk.green('✓ Tempo wallet setup complete!'));
          console.log();
          console.log(chalk.bold('Next steps:'));
          console.log('  1. Check status: tempo wallet -t whoami');
          console.log('  2. Fund wallet: tempo wallet fund');
          console.log('  3. Discover services: tempo wallet -t services --search ai');
        }
      }
    });
  } catch (error) {
    if (useJson) jsonError(ExitCode.GENERAL_ERROR, 'Failed to start Tempo authentication');
    console.error(chalk.red('Failed to start Tempo authentication'));
    console.error(error);
  }
}

async function setupOpenWallet(name: string, chain: string, useJson: boolean, passwordFile?: string, nonInteractive?: boolean): Promise<void> {
  if (!useJson) {
    console.log(chalk.bold('OpenWallet Standard Setup (by Moonpay)'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();
    console.log('This creates an encrypted MoonPay local wallet stored on YOUR local filesystem.');
    console.log('Agent Arena has NO access to your keys — they never leave your machine.');
    console.log();
    console.log(chalk.gray(`Storage location: ~/.agent-arena/wallets/${name}.json`));
    console.log();
  }

  // Validate wallet name (path traversal prevention)
  try {
    validateWalletName(name);
  } catch (err: any) {
    if (useJson) jsonError(ExitCode.INVALID_INPUT, err.message);
    console.error(chalk.red(`✗ ${err.message}`));
    process.exit(ExitCode.INVALID_INPUT);
  }

  // Validate chain
  if (!CHAIN_CONFIG[chain]) {
    if (useJson) jsonError(ExitCode.INVALID_INPUT, `Unknown chain: ${chain}`, { supportedChains: Object.keys(CHAIN_CONFIG) });
    console.error(chalk.red(`✗ Unknown chain: ${chain}`));
    console.log(chalk.gray(`Supported chains: ${Object.keys(CHAIN_CONFIG).join(', ')}`));
    process.exit(ExitCode.INVALID_INPUT);
  }

  // Check if wallet exists
  if (walletExists(name)) {
    if (useJson) jsonError(ExitCode.ALREADY_EXISTS, `Wallet "${name}" already exists`);
    console.error(chalk.red(`✗ Wallet "${name}" already exists`));
    console.log(chalk.gray('Use a different name or delete the existing wallet first'));
    process.exit(ExitCode.ALREADY_EXISTS);
  }

  let password: string;

  // Get password from file or prompt
  if (passwordFile) {
    if (!existsSync(passwordFile)) {
      if (useJson) jsonError(ExitCode.INVALID_INPUT, `Password file not found: ${passwordFile}`);
      console.error(chalk.red(`✗ Password file not found: ${passwordFile}`));
      process.exit(ExitCode.INVALID_INPUT);
    }
    password = readFileSync(passwordFile, 'utf8').trim();
    if (password.length < 8) {
      if (useJson) jsonError(ExitCode.INVALID_INPUT, 'Password in file must be at least 8 characters');
      console.error(chalk.red('✗ Password in file must be at least 8 characters'));
      process.exit(ExitCode.INVALID_INPUT);
    }
    if (!useJson) console.log(chalk.gray('Using password from file (not displayed for security)'));
  } else if (nonInteractive) {
    if (useJson) jsonError(ExitCode.INVALID_INPUT, '--password-file is required in non-interactive mode');
    console.error(chalk.red('✗ --password-file is required in non-interactive mode'));
    process.exit(ExitCode.INVALID_INPUT);
  } else {
    // Interactive: prompt for password
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message: 'Enter encryption password (min 8 chars):',
        mask: '*',
        validate: (input: string) => input.length >= 8 || 'Password must be at least 8 characters'
      },
      {
        type: 'password',
        name: 'confirmPassword',
        message: 'Confirm password:',
        mask: '*'
      }
    ]);

    if (!safePasswordEqual(answers.password, answers.confirmPassword)) {
      if (useJson) jsonError(ExitCode.INVALID_INPUT, 'Passwords do not match');
      console.error(chalk.red('✗ Passwords do not match'));
      process.exit(ExitCode.INVALID_INPUT);
    }
    password = answers.password;
  }

  const spinner = useJson ? null : ora('Generating wallet...').start();

  try {
    // Generate new wallet
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const chainConfig = CHAIN_CONFIG[chain];

    // Encrypt private key
    const { encrypted, iv, salt, authTag } = encryptPrivateKey(privateKey, password);

    const wallet: StoredWallet = {
      id: uuidv4(),
      name,
      address: account.address,
      chainId: chainConfig.chainId,
      chain: chainConfig.name,
      createdAt: new Date().toISOString(),
      encrypted: true,
      encryptedPrivateKey: encrypted,
      iv,
      salt,
      authTag
    };

    // Save wallet atomically (prevents TOCTOU race condition)
    const saved = saveWalletExclusive(wallet);
    if (!saved) {
      spinner?.fail(chalk.red('Wallet already exists (race condition)'));
      if (useJson) jsonError(ExitCode.ALREADY_EXISTS, `Wallet "${name}" already exists`);
      process.exit(ExitCode.ALREADY_EXISTS);
    }

    spinner?.succeed(chalk.green('Wallet created successfully!'));

    if (useJson) {
      jsonOut({
        ok: true,
        provider: 'openwallet',
        name,
        address: account.address,
        chain: chainConfig.name,
        chainId: chainConfig.chainId,
        accountId: `eip155:${chainConfig.chainId}:${account.address}`,
        storagePath: `~/.agent-arena/wallets/${name}.json`
      });
    } else {
      console.log();
      console.log(chalk.bold('Wallet Details:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`  ${chalk.cyan('Name:')}      ${name}`);
      console.log(`  ${chalk.cyan('Address:')}   ${account.address}`);
      console.log(`  ${chalk.cyan('Chain:')}     ${chainConfig.name} (${chainConfig.chainId})`);
      console.log(`  ${chalk.cyan('Encrypted:')} ${chalk.green('Yes')}`);
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
      console.log(chalk.bold('CAIP-10 Account ID:'));
      console.log(`  eip155:${chainConfig.chainId}:${account.address}`);
      console.log();
      console.log(chalk.bold('Security:'));
      console.log(chalk.white('  ✓ Private key encrypted with AES-256-GCM'));
      console.log(chalk.white('  ✓ Stored ONLY at: ~/.agent-arena/wallets/' + name + '.json'));
      console.log(chalk.white('  ✓ Agent Arena has ZERO access to your keys'));
      console.log();
      console.log(chalk.bold('Next steps:'));
      console.log(`  1. Fund your wallet with USDC on ${chainConfig.name}`);
      console.log('  2. Register with Agent Arena: POST /api/register');
      console.log('  3. Use for x402 payments');
    }

  } catch (error) {
    spinner?.fail(chalk.red('Failed to create wallet'));
    if (useJson) jsonError(ExitCode.GENERAL_ERROR, 'Failed to create wallet');
    console.error(error);
    process.exit(ExitCode.GENERAL_ERROR);
  }
}
