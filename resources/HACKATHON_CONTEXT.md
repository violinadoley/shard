# PL Genesis: Hackathon Context

## Event Details

- **Hackathon:** Protocol Labs - Frontiers of Collaboration
- **Deadline:** March 31, 2026 (TODAY)
- **Total Prize Pool:** $150,000+

## What Makes This Project Win

### The Killer Feature
Flow scheduled transactions let the vault **trigger itself** — no keepers, no friends, no external dependencies. If the user stops checking in, the vault wakes up on its own.

### The Security Innovation
Users never upload their own private keys. Instead, the system generates a fresh recovery wallet, encrypts it with Lit Protocol, and stores the blob on Storacha. The beneficiary gets the recovery wallet address, not the key.

### Deep Sponsor Integration
- **Flow:** Using Cadence with flagship Forte scheduled transactions feature
- **Lit:** Using v8 Naga SDK for conditional decryption (not simple encrypt/decrypt)
- **Storacha:** Using w3up-client for decentralized storage

## Critical Warnings

1. **Datil is DEAD** — Lit V0 networks shut down Feb 25, 2026. Must use Naga.
2. **Must use v8 SDK** — v6/v7 target dead Datil.
3. **Cadence over Solidity** — judges expect Cadence for Flow bounty.
4. **No keepers** — Flow scheduled transactions eliminate this need.

## What NOT To Do

- Do NOT use Solidity on Flow EVM — undercuts the Flow integration
- Do NOT add Zama — architecturally wrong for this use case
- Do NOT let users upload private keys — security risk
- Do NOT mock data — always connect to real contracts
