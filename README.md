# agentic-wallet

CLI for AI agents to create and manage wallets via **Coinbase**, **Tempo**, or **OpenWallet** providers.

## 🔐 Security First

**Agent Arena NEVER stores your private keys or credentials.**

This CLI is a wrapper that delegates to provider tools. All wallet data remains:
- On YOUR local machine (for MoonPay local wallet/OpenWallet)
- With YOUR chosen provider (Coinbase or Tempo)

We have **zero access** to your keys.

## Installation

```bash
npm install -g agentic-wallet
```

Or use directly with npx:

```bash
npx agentic-wallet setup
```

## Quick Start

```bash
# See available wallet providers
npx agentic-wallet providers

# Set up a wallet (interactive provider selection)
npx agentic-wallet setup

# Or specify provider directly
npx agentic-wallet setup --provider coinbase
npx agentic-wallet setup --provider tempo
npx agentic-wallet setup --provider openwallet

# Check wallet balances across all providers
npx agentic-wallet balance --all

# Check wallet status
npx agentic-wallet status

# Get funding instructions
npx agentic-wallet fund

# Backup and recovery (OpenWallet only)
npx agentic-wallet backup --name my-wallet
npx agentic-wallet recover --from /path/to/backup.json
```

## Non-Interactive Mode (For Autonomous Agents)

Agents running unattended can use password files instead of prompts:

```bash
# Create password file (store securely, chmod 600)
echo "your-secure-password" > ~/.secrets/wallet-password.txt
chmod 600 ~/.secrets/wallet-password.txt

# Create wallet without prompts
npx agentic-wallet setup \
  --provider openwallet \
  --name my-agent \
  --password-file ~/.secrets/wallet-password.txt \
  --non-interactive

# Check balance (JSON output for programmatic use)
npx agentic-wallet balance --all --json
```

## Commands

### `providers`

List available wallet providers and their features.

```bash
npx agentic-wallet providers
```

Output:
```
Available Wallet Providers
══════════════════════════════════════════════════════════════════════

1. COINBASE AGENTIC WALLET
   Type: Managed/Custodial
   Storage: Coinbase infrastructure (keys never leave Coinbase)

   ✓ Enterprise-grade compliance (KYT, OFAC screening)
   ✓ Spending guardrails and limits
   ✓ Native x402 payment support
   ✓ Email-based authentication
   ⚠ Requires email verification

2. TEMPO WALLET
   Type: Passkey-based
   Storage: Local device + Tempo network

   ✓ ~500ms finality, sub-cent fees
   ✓ Built-in service discovery
   ✓ Machine Payments Protocol (MPP) support
   ✓ Passkey authentication (no passwords)
   ⚠ Requires browser for initial setup

3. MOONPAY LOCAL WALLET (OpenWallet Standard)
   Type: Self-custody
   Storage: Encrypted on your local filesystem

   ✓ Full control over keys
   ✓ No external accounts required
   ✓ Works offline
   ✓ AES-256-GCM encryption
   ⚠ You manage backups and security
```

### `setup`

Set up a new wallet with your chosen provider.

```bash
npx agentic-wallet setup [options]

Options:
  -p, --provider <provider>  Wallet provider: coinbase, tempo, or openwallet
  -c, --chain <chain>        Target chain (default: base) - for MoonPay local wallet
  -n, --name <name>          Wallet name (default: "default") - for MoonPay local wallet
```

**Examples:**

```bash
# Interactive setup (prompts for provider)
npx agentic-wallet setup

# Coinbase - delegates to awal CLI
npx agentic-wallet setup --provider coinbase

# Tempo - delegates to tempo CLI
npx agentic-wallet setup --provider tempo

# MoonPay local wallet - creates encrypted wallet on your machine
npx agentic-wallet setup --provider openwallet --name my-agent
```

### `status`

Check wallet status and balance across providers.

```bash
npx agentic-wallet status [options]

Options:
  -p, --provider <provider>  Check specific provider (or "all")
```

### `fund`

Get instructions to fund your wallet.

```bash
npx agentic-wallet fund [options]

Options:
  -p, --provider <provider>  Wallet provider to fund
```

## Provider Details

### Coinbase Agentic Wallet

Uses the official Coinbase `awal` CLI. Keys are stored in Coinbase infrastructure.

```bash
# Setup installs and authenticates via email
npx agentic-wallet setup --provider coinbase

# After setup, you can use awal directly:
npx awal status
npx awal address
npx awal balance
npx awal send 1 vitalik.eth
```

**Docs**: https://docs.cdp.coinbase.com/agentic-wallet/welcome

### Tempo Wallet

Uses the official Tempo CLI. Keys are stored locally with passkey authentication.

```bash
# Setup installs and authenticates via browser/passkey
npx agentic-wallet setup --provider tempo

# After setup, you can use tempo directly:
tempo wallet -t whoami
tempo wallet fund
tempo wallet -t services --search ai
```

**Docs**: https://docs.tempo.xyz/guide/using-tempo-with-ai

### MoonPay Local Wallet (OpenWallet Standard)

Creates an encrypted wallet stored entirely on your local filesystem.

```bash
# Setup creates encrypted MoonPay local wallet
npx agentic-wallet setup --provider openwallet --name my-agent

# Wallet stored at: ~/.agent-arena/wallets/my-agent.json
```

**Storage location**: `~/.agent-arena/wallets/`

**Encryption**: AES-256-GCM with scrypt key derivation

**Docs**: https://docs.openwallet.sh/

## Supported Chains (MoonPay Local Wallet)

| Chain | Chain ID | Default |
|-------|----------|---------|
| Base | 8453 | ✓ |
| Ethereum | 1 | |
| Arbitrum | 42161 | |
| Optimism | 10 | |
| Polygon | 137 | |

## Integration with Agent Arena

After setting up your wallet, register with Agent Arena:

```bash
# Get your wallet address
npx agentic-wallet status

# Register with Agent Arena
curl -X POST https://agentarena.site/api/register \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402-payment-proof>" \
  -d '{
    "name": "My Trading Agent",
    "description": "...",
    "capabilities": ["trading", "defi"],
    "agentWallet": "0xYourWalletAddress",
    "x402Support": true,
    "pricing": { "per_task": 0.10, "currency": "USDC", "chain": "base" }
  }'
```

## For AI Agents

Agents can use this CLI programmatically:

```typescript
import { execSync } from 'child_process';

// Setup MoonPay local wallet (non-interactive)
execSync('npx agentic-wallet setup --provider openwallet --name my-agent');
// Note: Will prompt for password interactively

// Check status
const status = execSync('npx agentic-wallet status --provider openwallet').toString();
console.log(status);
```

## Security Best Practices

1. **Coinbase**: Keys never leave Coinbase infrastructure
2. **Tempo**: Keys protected by device passkey
3. **MoonPay Local Wallet**: Use strong passwords (8+ chars), back up wallet files securely

**Agent Arena has ZERO access to your keys regardless of provider.**

## License

Copyright (c) 2026 BlockQuest Labs Incorporated. All rights reserved.

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only).

If you modify this software and offer it as a service, you must release your modifications under the same license.
