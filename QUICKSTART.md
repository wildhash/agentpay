# AgentPay Quick Start Guide

This guide will walk you through setting up and running AgentPay locally.

## 🎯 For Judges: Fastest Path (3 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Start blockchain (keep running in terminal 1)
npm run node

# 3. Run full demo (in terminal 2)
npm run demo:full
```

**That's it!** The demo auto-deploys contracts and runs the complete scenario.

**For mainnet fork (uses real MNEE contract):**
```bash
npm run node:fork  # Instead of npm run node
npm run demo:full  # Same command, uses forked mainnet
```

---

## Prerequisites

- Node.js 16+ installed
- Terminal access
- (Optional) MetaMask for web UI

## Step-by-Step Setup

### 1. Clone and Install

```bash
git clone https://github.com/wildhash/agentpay.git
cd agentpay
npm install
```

### 2. Validate Installation

```bash
npm run validate
```

This checks that all files are present and properly structured.

### 3. Start Local Blockchain

Open a new terminal window and run:

```bash
npm run node
```

This starts a local Hardhat network with test accounts. Keep this running.

Output should show:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

### 4. Deploy Contract

Open another terminal window:

```bash
npm run deploy:local
```

This deploys the AgentEscrowMNEE contract (with MNEE stablecoin support) to your local blockchain.

Output should show:
```
Deploying AgentEscrowMNEE contract...
AgentEscrowMNEE deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
MNEE Token deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

The deployment info is saved to `deployments/localhost-deployment.json`.

### 5. Run Demo Scenario

```bash
npm run demo
```

This runs a complete end-to-end demo:
- Payer creates a task with 100 MNEE payment
- Payee submits a deliverable
- AI verifier scores the deliverable (85/100)
- Contract automatically splits payment: 85% to payee, 15% refund to payer

Expected output:
```
============================================================
AgentPay Demo Scenario
============================================================

Actors:
- Payer Agent: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- Payee Agent: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
- AI Verifier: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Step 1: Initial Balances
...

Step 8: Final Balances
...

Demo completed successfully! 🎉
```

### 6. Start Web Interface

```bash
npm run web
```

Open your browser to: http://localhost:8080

You can now:
- View account balances
- Create new tasks
- Submit deliverables
- Score and resolve tasks
- Watch events in real-time

### 7. (Optional) Start AI Verifier Service

In another terminal:

```bash
# With Claude or OpenAI API keys configured
npm run verifier

# Without API keys (deterministic mock scoring)
npm run verifier:mock
```

This starts the AI verifier REST API on port 3001.

API endpoints:
- `POST /verify/:taskId` - Verify and resolve a task
- `GET /task/:taskId` - Get task details
- `GET /health` - Health check

Example:
```bash
curl -X POST http://localhost:3001/verify/0
```

---

## 🌐 Mainnet Fork Mode (Recommended for Hackathon)

Running on a mainnet fork lets you use the **real MNEE contract** while staying local:

### Why Fork Mainnet?

✅ Uses actual MNEE contract address: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`  
✅ Demonstrates real contract interaction  
✅ No testnet faucet needed  
✅ Deterministic and reliable  
✅ Perfect for judges/demos  

### How to Use

**Step 1:** Start forked node (terminal 1):
```bash
npm run node:fork
```

This forks Ethereum mainnet at the latest block, giving you:
- Real MNEE contract at its mainnet address
- Unlimited ETH on test accounts for gas
- All mainnet state locally

**Step 2:** Run demo (terminal 2):
```bash
npm run demo:full
```

The deployment script automatically detects the fork and uses the real MNEE contract!

### Manual Fork Deployment

If you want to deploy manually on the fork:

```bash
# Terminal 1: Start fork
npm run node:fork

# Terminal 2: Deploy
npm run deploy:fork

# Terminal 3: Run demo
npm run demo
```

### Viewing Transactions

When running on fork, you'll see:
- MNEE token transfers at `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- Escrow contract interactions
- Quality-based payment splits
- All events logged

---

## Architecture Overview

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│ Payer Agent │─────────▶│ AgentEscrow  │◀─────────│ Payee Agent │
│             │  Create  │   Contract   │  Submit  │             │
└─────────────┘   Task   └──────┬───────┘ Deliver  └─────────────┘
                                 │                                  
                                 │ Score & Resolve                  
                                 ▼                                  
                         ┌──────────────┐                          
                         │ AI Verifier  │                          
                         │   Service    │                          
                         └──────────────┘                          
```

## Key Files

- `contracts/AgentEscrowMNEE.sol` - Main smart contract (MNEE-based)
- `contracts/AgentEscrow.sol` - Legacy contract (deprecated, ETH-based)
- `sdk/AgentPaySDK.js` - JavaScript SDK for MNEE
- `verifier/server.js` - AI verifier service
- `web/index.html` - Web interface
- `scripts/demo-scenario.js` - Demo script
- `scripts/deploy.js` - Deployment script

## Test Accounts

Hardhat provides 20 test accounts with 10,000 ETH each for gas fees.
MNEE tokens are minted during deployment for testing:

- **Account #0** (Verifier/Deployer): `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Account #1** (Payer): `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Account #2** (Payee): `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

Private keys are in Hardhat's documentation (never use these on mainnet!).

## Common Issues

### "Deployment not found" error

Make sure you've run `npm run deploy:local` after starting the local node.

### "Network connection failed"

Ensure the local blockchain is running with `npm run node`.

### Port already in use

Stop other services using ports 8545 (blockchain), 8080 (web), or 3001 (verifier).

### Contract compilation failed

This requires internet access to download the Solidity compiler. The ABI is already pre-compiled in `sdk/AgentEscrow.abi.json`.

## Next Steps

- Read the full [README.md](../README.md) for detailed documentation
- Explore the smart contract code in `contracts/AgentEscrowMNEE.sol`
- Try modifying the demo scenario in `scripts/demo-scenario.js`
- Build your own agent using the SDK in `sdk/AgentPaySDK.js`
- Deploy to Sepolia testnet using `npm run deploy:sepolia`

## Support

For issues or questions:
- Open an issue on GitHub
- Check the README.md for more details
- Review the code comments in each file
