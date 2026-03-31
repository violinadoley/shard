# Shard Frontend

Next.js application for Shard - Dead Man's Switch Wallet Recovery.

## Tech Stack

- **Framework:** Next.js 14+
- **Wallet:** Flow Client Library (FCL) + @onflow/react-sdk
- **Styling:** Tailwind CSS
- **State:** React hooks + SWR for data fetching

## Key Dependencies

```json
{
  "@onflow/fcl": "^1.4.0",
  "@onflow/react-sdk": "^1.4.0",
  "@lit-protocol/lit-node-client": "^8.0.0",
  "@web3-storage/w3up-client": "^12.0.0"
}
```

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ADDRESS=<your-contract-address>
NEXT_PUBLIC_LIT_NETWORK=nagaDev
```

## Features

### Wallet Connection
- Connect with Flow Wallet, Blocto, or Lilico
- FCL handles authentication

### Vault Creation
- Set recovery address (beneficiary)
- Set inactivity period
- Deposit assets

### Heartbeat
- Check in to reset the timer
- Visual countdown display

### Recovery Claim
- Beneficiary connects after trigger
- Lit decrypts recovery key
- Beneficiary accesses recovery wallet

## Architecture

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing / vault list
│   │   ├── create/page.tsx    # Create vault
│   │   └── vault/[id]/page.tsx # Vault detail
│   ├── components/
│   │   ├── WalletButton.tsx
│   │   ├── VaultCard.tsx
│   │   ├── HeartbeatButton.tsx
│   │   └── ClaimButton.tsx
│   └── lib/
│       ├── flow.ts            # FCL config
│       ├── lit.ts             # Lit v8 client
│       └── storacha.ts        # w3up-client
```

## Security Notes

- Never log private keys
- All contract calls verified
- No mock data in production
