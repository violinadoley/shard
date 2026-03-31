# Shard - Dead Man's Switch Wallet Recovery

## Overview

Shard is a self-custodial inheritance system that automatically wakes up if a user stops checking in. Users deposit assets into a vault, set a recovery address and inactivity period, and the vault self-triggers on Flow's scheduled transactions when abandoned.

**The killer feature:** Flow's scheduled transactions let the vault trigger itself — no external keepers, no friends needed.

## The Problem

People lose access to crypto. People die. Families cannot recover assets. Existing solutions require external keepers or trust in third parties.

## The Solution

A truly autonomous vault that:
- Holds assets and tracks heartbeats
- Uses Flow scheduled transactions for self-triggering
- Stores encrypted recovery keys via Lit Protocol + Storacha
- Generates fresh recovery wallets so users never upload private keys

## Architecture

```
User -> Frontend (Flow FCL) -> Flow Cadence Contract
                                |
                                v
                    Flow Scheduled Transactions
                    (auto-trigger on inactivity)
                                |
                                v
                    Lit Protocol (conditional decrypt)
                                |
                                v
                    Storacha (encrypted key blob)
                                |
                                v
                    Beneficiary claims recovery wallet
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contracts | Flow Cadence | Vault logic + scheduled transactions |
| Encryption | Lit Protocol v8 (Naga) | Conditional secret release |
| Storage | Storacha | Encrypted key blob with CID |
| Frontend | Next.js + FCL | User-facing wallet connection |
| Wallet | Flow Wallet / Blocto / Lilico | User authentication |

## Key Design Decisions

### Why Cadence over Solidity?
Flow's scheduled transactions are Cadence-native. Using Solidity on Flow EVM would not leverage this killer feature. Judges expect Cadence for a serious Flow submission.

### Why Flow + Lit + Storacha?
- **Flow:** Self-triggering scheduled transactions (the main differentiator)
- **Lit:** Conditional decryption gated by `contract.triggered == true`
- **Storacha:** Decentralized hot storage with CID on-chain

### Why NOT Zama?
Zama's FHE is for confidential computation on encrypted state (hidden balances, sealed bids). Shard only needs conditional key release — that's Lit, not FHE. Shoehorning Zama would be architecturally forced.

### Why NOT upload user's own recovery key?
Users should NEVER upload their own private key to a browser. Instead, the system generates a fresh recovery wallet, encrypts that key with Lit, and stores on Storacha. The user only shares the recovery wallet address with beneficiaries.

## Contract Flow

1. **Setup:** User creates vault in Cadence, deposits assets, sets recovery address + inactivity period. Contract immediately schedules its own check-in deadline.

2. **Heartbeat:** User checks in periodically. Each check-in cancels the existing scheduled transaction and schedules a new one further in the future.

3. **Auto-trigger:** If user stops checking in, the scheduled transaction fires automatically. Contract sets `triggered = true`. No external keepers needed.

4. **Claim:** Beneficiary connects wallet, Lit checks `triggered == true`, decrypts the recovery key from Storacha, beneficiary can claim.

## Security Considerations

- Recovery key is never exposed to user or browser
- Encrypted blob stored on Storacha, CID on-chain
- Lit access condition is `contract.triggered == true`
- Fresh wallet generation eliminates key exposure risk
- Flow scheduled transactions eliminate keeper dependency
