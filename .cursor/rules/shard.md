# Shard Project Rules

## Critical

- Use **nagaDev + v8 SDK** for Lit (Datil is dead)
- Use **Cadence** for Flow contracts (not Solidity)
- **Never upload user private keys** — generate fresh wallets
- **Never mock** contract integrations

## Stack

- Flow Cadence + scheduled transactions
- Lit v8 (Naga) for conditional decryption
- Storacha (w3up-client) for encrypted blob storage
- Next.js + FCL for frontend

## No Zama, No Filecoin

FHE is wrong for this use case. Storacha handles storage.
