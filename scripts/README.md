# Deployment Scripts

## Prerequisites

1. Flow CLI installed (`brew install flow-cli`)
2. Flow testnet account created and funded
3. Storacha account set up
4. Lit v8 SDK installed

## Scripts

### Flow Contract Deployment

```bash
# Navigate to contracts
cd contracts/cadence

# Deploy to testnet
flow accounts create  # if not done
flow project deploy --network testnet
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Environment Setup

Create `.env.local` in frontend:

```env
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ADDRESS=<your-address>
NEXT_PUBLIC_LIT_NETWORK=nagaDev
```
