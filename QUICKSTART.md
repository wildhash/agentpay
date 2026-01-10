# AgentPay Quick Start Guide

This guide will walk you through setting up and running AgentPay locally.

## Prerequisites

- Node.js 16+ installed
- Python 3 installed (for web demo)
- Terminal access

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

This deploys the AgentEscrow contract to your local blockchain.

Output should show:
```
Deploying AgentEscrow contract...
AgentEscrow deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

The deployment info is saved to `deployments/localhost-deployment.json`.

### 5. Run Demo Scenario

```bash
npm run demo
```

This runs a complete end-to-end demo:
- Payer creates a task with 0.1 ETH payment
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
npm run verifier
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

- `contracts/AgentEscrow.sol` - Smart contract
- `sdk/AgentPaySDK.js` - JavaScript SDK
- `verifier/server.js` - AI verifier service
- `web/index.html` - Web interface
- `scripts/demo-scenario.js` - Demo script
- `scripts/deploy.js` - Deployment script

## Test Accounts

Hardhat provides 20 test accounts with 10,000 ETH each:

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
- Explore the smart contract code in `contracts/AgentEscrow.sol`
- Try modifying the demo scenario in `scripts/demo-scenario.js`
- Build your own agent using the SDK in `sdk/AgentPaySDK.js`
- Deploy to Sepolia testnet using `npm run deploy:sepolia`

## Support

For issues or questions:
- Open an issue on GitHub
- Check the README.md for more details
- Review the code comments in each file
