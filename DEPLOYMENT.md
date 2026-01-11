# AgentPay Deployment Guide

This guide covers deploying AgentPay to production for Devpost submission.

## Deployment Options

### Option 1: Sepolia Testnet (Recommended for Hackathon)

**Pros:**
- Public testnet, judges can verify transactions
- Easy to share and demonstrate
- No mainnet risk

**Cons:**
- Requires testnet MNEE (may need to deploy mock token)
- Need Sepolia ETH for gas

### Option 2: Mainnet Fork (Alternative)

**Pros:**
- Uses real MNEE contract address
- Local control, deterministic
- No gas costs

**Cons:**
- Can't share live URL easily
- Requires running local node

## Step-by-Step: Sepolia Deployment

### 1. Prepare Environment

```bash
# Create .env file in root
cat > .env << EOF
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
EOF
```

### 2. Get Sepolia ETH

- Visit [Sepolia Faucet](https://sepoliafaucet.com/)
- Get at least 0.5 ETH for deployments and testing

### 3. Deploy Contracts

```bash
# Deploy to Sepolia
npm run deploy:sepolia
```

This will:
- Deploy MockMNEE token (for testing)
- Deploy AgentEscrowMNEE contract
- Grant verifier role to deployer
- Save addresses to `deployments/sepolia-deployment.json`

### 4. Configure Next.js Demo

```bash
# After deployment, update demo-nextjs/.env.local
cd demo-nextjs

# Get deployed addresses from deployments/sepolia-deployment.json
MNEE_ADDRESS=$(jq -r '.mneeToken' ../deployments/sepolia-deployment.json)
ESCROW_ADDRESS=$(jq -r '.escrowContract' ../deployments/sepolia-deployment.json)

# Create .env.local
cat > .env.local << EOF
# Sepolia Network
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_MNEE_ADDRESS=$MNEE_ADDRESS
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW_ADDRESS

# Server Signer (create new wallet for this!)
SERVER_PRIVATE_KEY=your_new_wallet_private_key

# Verifier Service (if deployed separately)
VERIFIER_URL=https://your-verifier-service.com

# Network
NEXT_PUBLIC_NETWORK=sepolia
EOF
```

### 5. Fund Server Signer

The server signer needs:
- Sepolia ETH for gas (~0.1 ETH)
- MNEE tokens for creating tasks

```bash
# Using the deployed contracts, send MNEE to server signer
# You can do this via web UI or scripts
```

### 6. Deploy to Vercel

```bash
cd demo-nextjs

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Select/create project
# - Set root directory to demo-nextjs
# - Set framework to Next.js
# - Add environment variables when prompted
```

#### Required Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_RPC_URL` | `https://sepolia.infura.io/v3/YOUR_KEY` | Plain Text |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` | Plain Text |
| `NEXT_PUBLIC_MNEE_ADDRESS` | Your deployed MNEE address | Plain Text |
| `NEXT_PUBLIC_ESCROW_ADDRESS` | Your deployed escrow address | Plain Text |
| `SERVER_PRIVATE_KEY` | Server wallet private key | **Secret** |
| `VERIFIER_URL` | Verifier service URL or leave empty for fallback | Plain Text |

**Important:** Mark `SERVER_PRIVATE_KEY` as **Secret** in Vercel!

### 7. Deploy Verifier Service (Optional)

If you want live AI verification:

**Option A: Deploy to Railway/Render**

```bash
# In root directory
# Create a Dockerfile for verifier
cat > verifier/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY verifier/ ./verifier/
COPY sdk/ ./sdk/
ENV PORT=3001
CMD ["node", "verifier/server.js"]
EOF

# Deploy to Railway or Render with:
# - ANTHROPIC_API_KEY or OPENAI_API_KEY
# - RPC_URL
# - CONTRACT_ADDRESS
# - VERIFIER_PRIVATE_KEY
```

**Option B: Use Fallback Mode**

The Next.js app has built-in fallback (score: 75) if verifier is unavailable.

### 8. Test Deployment

```bash
# Visit your Vercel URL
# https://your-app.vercel.app

# Test the flow:
# 1. Check system status loads
# 2. Create a task
# 3. Submit deliverable
# 4. Run verifier
# 5. Settle task
# 6. Check event log shows all steps
```

## Step-by-Step: Mainnet Fork (Local Demo)

### 1. Start Forked Node

```bash
# Terminal 1
npm run node:fork
```

### 2. Deploy Contracts

```bash
# Terminal 2
npm run deploy:local
```

Note: This uses real MNEE address `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`

### 3. Configure Demo

```bash
cd demo-nextjs

# Update escrow address from deployment
ESCROW_ADDRESS=$(jq -r '.escrowContract' ../deployments/localhost-deployment.json)

cat > .env.local << EOF
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_MNEE_ADDRESS=0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW_ADDRESS
SERVER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
VERIFIER_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK=local
EOF
```

### 4. Start Services

```bash
# Terminal 3: Verifier
npm run verifier:mock

# Terminal 4: Next.js demo
cd demo-nextjs
npm run dev
```

### 5. Record Demo Video

Now record your screen showing the complete flow!

## Troubleshooting

### "Insufficient funds" error

**Problem:** Server signer doesn't have enough MNEE

**Solution:**
```bash
# Send MNEE to server signer address
# You can use scripts/demo-scenario.js as reference
```

### "Contract not deployed" error

**Problem:** NEXT_PUBLIC_ESCROW_ADDRESS not set or wrong

**Solution:**
```bash
# Check deployments/[network]-deployment.json
# Copy escrowContract address to .env.local
```

### Verifier returns 500 error

**Problem:** Verifier service not running or API keys missing

**Solution:**
- Use `npm run verifier:mock` for deterministic scoring
- Or deploy verifier with API keys

### Transactions fail with "nonce too high"

**Problem:** Nonce mismatch (common in development)

**Solution:**
```bash
# Reset Hardhat node
# Ctrl+C in terminal, then restart:
npm run node
npm run deploy:local
```

## Production Checklist

Before submitting to Devpost:

- [ ] Contracts deployed to Sepolia (or mainnet fork documented)
- [ ] Next.js app deployed to Vercel
- [ ] Server signer funded with ETH + MNEE
- [ ] All environment variables set in Vercel
- [ ] Live demo tested end-to-end
- [ ] Demo video recorded (2-4 minutes)
- [ ] README updated with live URL
- [ ] GitHub repository is public
- [ ] LICENSE file included (MIT)

## Demo Video Script

**Duration:** 2-3 minutes

1. **Problem** (15 sec)
   - AI agents need trustless payments
   - Manual dispute resolution doesn't scale

2. **Solution Overview** (15 sec)
   - Smart contract escrow + AI verification
   - Powered by MNEE stablecoin

3. **Live Demo** (90 sec)
   - Show system status (MNEE balance, network)
   - Create task: 100 MNEE escrow
   - Submit deliverable
   - AI verification: score 75/100
   - Settle: 75 MNEE to payee, 25 MNEE refund
   - Show event log with tx hashes

4. **Why MNEE** (20 sec)
   - Programmable money
   - Score-based splits
   - USD stability for agents

5. **Impact** (10 sec)
   - Enables autonomous agent economy
   - Trustless, automated, fair

## Post-Deployment

### Update README

```bash
# Replace placeholder URLs in README.md
YOUR_VERCEL_URL_HERE → https://agentpay-demo.vercel.app
YOUR_DEMO_VIDEO_URL_HERE → https://youtube.com/watch?v=...
```

### Share on Devpost

1. Create Devpost submission
2. Add live demo URL
3. Embed demo video
4. Link to GitHub repository
5. Include MNEE integration details

---

**Questions?** Check the main README or open an issue on GitHub.
