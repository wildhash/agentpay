# AgentPay Demo - Next.js Web Application

A modern web interface for demonstrating AgentPay's programmable escrow system with AI verification and MNEE stablecoin.

## Features

- **Server-Side Signer**: No MetaMask required - uses server wallet for transactions
- **Complete Task Flow**: Create → Submit → Verify → Settle in one interface
- **AI Verification**: Integrated with Claude-powered verifier service
- **Real-time Events**: Live event log showing all blockchain transactions
- **MNEE Integration**: Native support for MNEE stablecoin on mainnet/testnet

## Quick Start

### Prerequisites

1. Node.js 18+ installed
2. Hardhat node running (or access to Sepolia testnet)
3. Contracts deployed (MNEE token + AgentEscrow)
4. Verifier service running (optional, falls back to deterministic scoring)

### Installation

```bash
cd demo-nextjs
npm install
```

### Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# For local development with Hardhat
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_MNEE_ADDRESS=0x... # Your deployed MNEE token address
NEXT_PUBLIC_ESCROW_ADDRESS=0x... # Your deployed escrow contract address
SERVER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
VERIFIER_URL=http://localhost:3001

# For Sepolia testnet
# NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
# NEXT_PUBLIC_CHAIN_ID=11155111
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Create a Task

- Enter payee address (agent who will complete the work)
- Specify amount in MNEE
- Write task specification
- Set deadline in minutes
- Click "Create & Fund Escrow"

The server signer will approve MNEE and create the task on-chain.

### 2. Submit Deliverable

- Enter the task ID (from creation)
- Paste the work result/deliverable
- Click "Submit Result"

### 3. Run AI Verifier

- Keep the same task ID and result
- Click "Run Verifier"
- AI will score the deliverable (0-100)

### 4. Settle Task

- After verification, click "Settle"
- Funds are distributed based on score:
  - Payee receives: `amount * (score/100)`
  - Payer refund: `amount * (1 - score/100)`

## Architecture

```
demo-nextjs/
├── app/
│   ├── api/           # API routes (server-side transaction signing)
│   │   ├── status/    # GET system status
│   │   └── task/
│   │       ├── create/    # POST create task
│   │       ├── submit/    # POST submit deliverable
│   │       ├── verify/    # POST AI verification
│   │       ├── settle/    # POST settle task
│   │       └── [id]/      # GET task by ID
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Main page
│   └── globals.css    # Global styles
├── components/
│   ├── StatusCard.tsx        # System status display
│   ├── CreateTaskCard.tsx    # Task creation form
│   ├── TaskActionsCard.tsx   # Submit/Verify/Settle controls
│   └── EventLog.tsx          # Event history display
├── lib/
│   ├── contracts.ts   # Contract ABIs and utilities
│   └── utils.ts       # Helper functions
└── package.json
```

## Deployment to Vercel

### Option 1: Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wildhash/agentpay&project-name=agentpay-demo&root-directory=demo-nextjs)

### Option 2: Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd demo-nextjs
vercel
```

### Environment Variables in Vercel

Add these in your Vercel project settings:

- `NEXT_PUBLIC_RPC_URL` - Your RPC endpoint
- `NEXT_PUBLIC_CHAIN_ID` - Network chain ID
- `NEXT_PUBLIC_MNEE_ADDRESS` - MNEE token address
- `NEXT_PUBLIC_ESCROW_ADDRESS` - Escrow contract address
- `SERVER_PRIVATE_KEY` - Server signer private key (keep secure!)
- `VERIFIER_URL` - Verifier service URL (if deployed separately)

## Production Considerations

### Security

- **Never commit** `.env.local` to git
- Use Vercel environment variables for production secrets
- Consider using a dedicated server signer wallet with limited MNEE balance
- Implement rate limiting on API routes
- Add authentication if needed

### Network Selection

For production, you have two options:

**Option 1: Sepolia Testnet** (Recommended for hackathon)
- Deploy contracts to Sepolia
- Fund server signer with Sepolia ETH + MNEE
- Easy for judges to verify transactions

**Option 2: Mainnet Fork**
- Run forked mainnet node
- Demo locally or via recorded walkthrough
- Include clear instructions in README

### Verifier Service

The demo includes fallback logic if the verifier service is unavailable:
- Returns a deterministic score of 75
- Displays "fallback mode" indicator
- Useful for demos when verifier isn't running

## API Reference

### GET /api/status

Returns system status and balances.

### POST /api/task/create

Creates a new task and funds escrow.

**Body:**
```json
{
  "payee": "0x...",
  "amount": 100,
  "spec": "Task description",
  "deadlineMins": 60
}
```

**Response:**
```json
{
  "taskId": "0",
  "txHash": "0x...",
  "blockNumber": 12345
}
```

### POST /api/task/submit

Submits deliverable for a task.

**Body:**
```json
{
  "taskId": 0,
  "resultText": "Work deliverable"
}
```

### POST /api/task/verify

Calls AI verifier service.

**Body:**
```json
{
  "spec": "Task description",
  "resultText": "Work deliverable"
}
```

**Response:**
```json
{
  "score": 85,
  "rationale": "AI analysis..."
}
```

### POST /api/task/settle

Settles task with score-based payout.

**Body:**
```json
{
  "taskId": 0,
  "score": 85
}
```

## Troubleshooting

### "Failed to connect to blockchain"

- Ensure Hardhat node is running: `npm run node` (in project root)
- Check `.env.local` has correct RPC URL
- Verify contracts are deployed

### "Server configuration error"

- Check all required env vars are set
- Verify `NEXT_PUBLIC_ESCROW_ADDRESS` is not empty
- Ensure `SERVER_PRIVATE_KEY` is valid

### "Insufficient MNEE balance"

- Fund server signer with MNEE tokens
- Check allowance is approved for escrow contract

### Verifier unavailable

- Start verifier service: `npm run verifier` (in project root)
- Or use fallback mode (score 75 automatically)

## License

MIT - See root LICENSE file
