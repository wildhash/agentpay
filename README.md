# 🤖 AgentPay — AI-Native Payments with MNEE

[![Hackathon](https://img.shields.io/badge/MNEE-Hackathon-purple)](https://mnee.io)
[![Hackathon](https://img.shields.io/badge/Hackathon-MNEE%20Programmable%20Money-blueviolet)](https://mnee.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **Trustless escrow + AI verification + instant partial/full refunds for autonomous agents**

AgentPay is a decentralized payment infrastructure built for the autonomous agent economy. Using MNEE stablecoin on Ethereum, it enables AI agents to transact trustlessly with automatic quality-based settlements.

---

## 🎯 For Hackathon Judges: Quick Start

### 🌐 Live Demo (Recommended)

**[🚀 Try the Live Demo →](YOUR_VERCEL_URL_HERE)**

Experience the full AgentPay flow in your browser:
- ✅ Create tasks with MNEE escrow (server-signed transactions)
- ✅ Submit deliverables and get AI scores
- ✅ Watch automatic settlement with real-time event log
- ✅ No MetaMask required - uses server signer for smooth demo experience

**📹 Demo Video:** [Watch 2-minute walkthrough](YOUR_DEMO_VIDEO_URL_HERE)

### 💻 Run Locally

**📋 Full MNEE integration proof:** See [MNEE_INTEGRATION_SUMMARY.md](MNEE_INTEGRATION_SUMMARY.md) for detailed verification checklist.

**Option 1: Next.js Web Demo (Recommended)**

```bash
# 1. Install dependencies
npm install

# 2. Start Hardhat node (terminal 1)
npm run node

# 3. Deploy contracts (terminal 2)
npm run deploy:local

# 4. Start verifier service (terminal 3)
npm run verifier:mock

# 5. Start Next.js demo (terminal 4)
cd demo-nextjs
npm install
npm run dev  # Open http://localhost:3000
```

**Option 2: Terminal Demo**

```bash
# 1. Start local blockchain (in terminal 1)
npm run node

# 2. Run full demo (in terminal 2) - deploys & demonstrates complete flow
npm run demo:full

# 3. (Optional) Start legacy web UI
npm run web  # Open http://localhost:8080
```

**For mainnet fork (uses real MNEE contract address):**
```bash
npm run node:fork  # Terminal 1: Fork mainnet with real MNEE
npm run demo:full  # Terminal 2: Run demo with actual MNEE contract
```

**What you'll see:**
- ✅ Agent A deposits **100 MNEE** into escrow contract
- ✅ Agent B submits deliverable (Python code)
- ✅ AI verifier scores quality: **85/100**
- ✅ Contract auto-splits: **85 MNEE to payee, 15 MNEE refund to payer**
- ✅ All MNEE transfers logged on-chain

### 🔍 Proof of MNEE Integration

**Verify MNEE usage in code without compiling:**

1. **Smart Contract** (`contracts/AgentEscrowMNEE.sol`):
   - Line 18: `IERC20 public immutable mneeToken;` - Stores MNEE token reference
   - Line 64: `mneeToken.transferFrom(msg.sender, address(this), _amount)` - Deposits MNEE
   - Line 162-163: `mneeToken.transfer(payee, payeeAmount)` - Sends MNEE to worker
   - Line 166: `mneeToken.transfer(payer, refundAmount)` - Sends MNEE refund

2. **Deployment Script** (`scripts/deploy.js`):
   - Line 11: `const MNEE_MAINNET = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";`
   - Line 33-36: Mainnet detection uses real MNEE contract

3. **Demo Script** (`scripts/demo-scenario.js`):
   - Line 16: `const DEMO_TASK_AMOUNT = "100"; // 100 MNEE`
   - Lines 115-125: Shows MNEE approval and balance checks
   - Lines 140-150: Shows MNEE transfers during settlement

4. **SDK** (`sdk/AgentPaySDK.js`):
   - Lines 60-80: MNEE-specific methods (`approveMnee`, `getMneeBalance`, etc.)
   - Line 99: `await this.mneeToken.approve(...)` - Approval flow
   - Line 115: `await this.contract.createTask(...)` - Uses approved MNEE

**Run without internet (uses pre-compiled ABIs in `sdk/`):**
```bash
npm install  # Only needs to download npm packages
npm run node  # No compilation needed for local node
npm run demo:full  # Uses pre-built contract ABIs
```

---

## 💰 How We Use MNEE

AgentPay is built **exclusively** on MNEE stablecoin for all payments:

| MNEE Integration | Implementation |
|------------------|----------------|
| **Contract Reference** | Mainnet: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |
| **Deposit Flow** | `MNEE.approve()` → `escrow.createTask()` → `MNEE.transferFrom()` |
| **Settlement Flow** | Score-based split: `MNEE.transfer(payee)` + `MNEE.transfer(payer)` |
| **Partial Refunds** | Quality score determines payout ratio (e.g., 85/100 = 85% payment, 15% refund) |
| **USD Stability** | MNEE's peg ensures predictable costs for agents |
| **Gas Efficiency** | ERC-20 standard, 6 decimals like USDC |

**Key transactions visible in demo:**
1. `approve(escrow, 100 MNEE)` - Payer authorizes escrow
2. `transferFrom(payer, escrow, 100 MNEE)` - Funds locked in contract
3. `transfer(payee, 85 MNEE)` - Quality-based payment
4. `transfer(payer, 15 MNEE)` - Automatic refund

**Why MNEE for agents?**
- 💵 USD-stable pricing (no ETH volatility risk)
- 🤖 Programmable money via smart contracts
- ⚡ Fast finality on Ethereum L1
- 🔒 Battle-tested ERC-20 security

---

## 🎯 Problem Statement

As AI agents become more autonomous, they need to:
- **Pay for services** (compute, data, other agents' work)
- **Get paid for deliverables** without trusting counterparties  
- **Handle disputes fairly** when output quality varies
- **Scale transactions** without human intervention

Traditional payment systems require trust and manual dispute resolution. AgentPay solves this with smart contract escrow and AI-powered verification.

## 💡 Solution

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgentPay Architecture                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐         ┌──────────────┐         ┌────────────┐ │
│   │  Agent A     │         │   Escrow     │         │  Agent B   │ │
│   │  (Payer)     │────────▶│   Contract   │◀────────│  (Payee)   │ │
│   │              │ Create  │              │ Submit  │            │ │
│   │  💰 MNEE     │  Task   │  🔒 MNEE     │ Work    │  📦 Output │ │
│   └──────────────┘         └──────┬───────┘         └────────────┘ │
│                                   │                                 │
│                                   │ Score                           │
│                                   ▼                                 │
│                           ┌──────────────┐                          │
│                           │ AI Verifier  │                          │
│                           │   Service    │                          │
│                           │              │                          │
│                           │  🤖 Claude   │                          │
│                           │  Score 0-100 │                          │
│                           └──────┬───────┘                          │
│                                  │                                  │
│                                  ▼                                  │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │                    Settlement Logic                          │ │
│   │                                                              │ │
│   │   Score: 85/100                                              │ │
│   │   ├── Payee receives: 85 MNEE (85%)                         │ │
│   │   └── Payer refund:   15 MNEE (15%)                         │ │
│   │                                                              │ │
│   └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| **MNEE Stablecoin** | USD-pegged payments for predictable value |
| **Smart Escrow** | Funds locked until AI verification completes |
| **AI Scoring** | Claude/GPT evaluates deliverables (0-100 scale) |
| **Partial Refunds** | Proportional settlement based on quality score |
| **Time-Locked Safety** | Auto-refund if payee doesn't deliver |
| **Role-Based Access** | Only authorized verifiers can resolve disputes |
| **Agent Reputation** | Track success rates and earnings on-chain |
| **Gas Optimized** | Efficient contract design for high-volume usage |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/wildhash/agentpay.git
cd agentpay

# Install dependencies
npm install

# Copy environment file (optional - works without API keys)
cp .env.example .env
```

### One-Command Demo

The fastest way to see AgentPay in action:

```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Run complete demo (auto-deploys + runs scenario)
npm run demo:full
```

### Alternative: Mainnet Fork Mode (Recommended for Judges)

Run with the **real MNEE contract** on a forked mainnet:

```bash
# Terminal 1: Fork Ethereum mainnet
npm run node:fork

# Terminal 2: Run demo (uses actual MNEE contract address)
npm run demo:full
```

This mode:
- ✅ Uses real MNEE contract address: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- ✅ Forks live Ethereum state locally
- ✅ Deterministic and always works
- ✅ Best for hackathon demonstrations

### Manual Demo (Step-by-Step)

```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local

# Terminal 3: Run demo scenario
npm run demo
```

### Start Services

```bash
# AI Verifier service (port 3001)
npm run verifier        # With Claude/OpenAI API keys
npm run verifier:mock   # Without API keys (deterministic scoring)

# Next.js Demo App (port 3000) - Recommended
cd demo-nextjs
npm install
npm run dev

# Legacy Web UI (port 8080)
npm run web
```

**Next.js Demo:** Open http://localhost:3000 (server-signer, no MetaMask needed)
**Legacy UI:** Open http://localhost:8080 (requires MetaMask)

## 📋 Task Lifecycle

```
1. CREATED     Agent A deposits MNEE, defines task
       ↓
2. SUBMITTED   Agent B delivers output (IPFS hash)
       ↓
3. VERIFIED    AI scores quality (0-100)
       ↓
4. RESOLVED    Contract auto-splits payment

Alternative paths:
- CANCELLED   Payer cancels before submission → full refund
- TIMED OUT   Deadline passes without submission → full refund
```

## 🔧 Smart Contract API

### MNEE Approval Flow (Important!)

Before creating tasks, you **must** approve the escrow contract to spend MNEE:

```javascript
// Using ethers.js
const mneeToken = new ethers.Contract(mneeAddress, mneeABI, signer);
await mneeToken.approve(escrowAddress, amountInMnee);

// Or approve unlimited
await mneeToken.approve(escrowAddress, ethers.MaxUint256);
```

### Core Functions

```solidity
// Create a task with MNEE deposit (requires prior approval!)
function createTask(
    address payee,
    string description,
    uint256 amount,        // Amount in MNEE (6 decimals)
    uint256 timeout
) returns (uint256 taskId)

// Submit deliverable (payee only)
function submitDeliverable(
    uint256 taskId,
    string deliverableHash
)

// Score and resolve (verifier only)
function scoreAndResolve(
    uint256 taskId,
    uint8 score  // 0-100
)

// Cancel before submission (payer only)
function cancelTask(uint256 taskId, string reason)

// Claim timeout refund (payer only)
function claimTimeout(uint256 taskId)
```

### Events

```solidity
event TaskCreated(taskId, payer, payee, amount, description, timeout);
event TaskSubmitted(taskId, deliverableHash, submittedAt);
event TaskScored(taskId, score, verifier);
event TaskResolved(taskId, payeeAmount, refundAmount, score);
event TaskCancelled(taskId, refundAmount, reason);
event TaskTimedOut(taskId, refundAmount);
```

## 🤖 AI Verifier API

The verifier service evaluates deliverables using LLM scoring:

```bash
# Score a deliverable (dry run)
curl -X POST http://localhost:3001/score \
  -H "Content-Type: application/json" \
  -d '{
    "taskDescription": "Create a Python sorting function",
    "deliverableContent": "def sort(arr): return sorted(arr)"
  }'

# Response
{
  "score": 75,
  "breakdown": {
    "completeness": 22,
    "quality": 20,
    "accuracy": 18,
    "relevance": 15
  },
  "reasoning": "Function works but lacks error handling and documentation",
  "model": "claude"
}

# Verify and resolve on-chain
curl -X POST http://localhost:3001/verify/0

# Get task info
curl http://localhost:3001/task/0

# Health check
curl http://localhost:3001/health
```

## 📚 SDK Usage

### JavaScript SDK Example

```javascript
const AgentPaySDK = require('./sdk/AgentPaySDK');

// Initialize SDK with MNEE support
const sdk = new AgentPaySDK(
  'https://rpc.ethereum.org',           // RPC URL
  '0xYourEscrowContractAddress',        // Escrow contract
  '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF', // MNEE token
  'your_private_key'                    // Your private key
);

// Step 1: Check MNEE balance
const balance = await sdk.getMneeBalance(myAddress);
console.log(`MNEE Balance: ${balance}`);

// Step 2: Approve MNEE spending (required before creating tasks!)
await sdk.approveMnee('1000'); // Approve 1000 MNEE
// Or approve unlimited: await sdk.approveMnee('max');

// Step 3: Create a task
const { taskId, txHash } = await sdk.createTask(
  payeeAddress,
  'Build a REST API for user authentication',
  '100',  // 100 MNEE
  0       // Use default timeout
);
console.log(`Task created: ${taskId}`);

// Step 4: Submit deliverable (as payee)
await sdk.submitDeliverable(taskId, 'ipfs://QmYourDeliverable123');

// Step 5: Score and resolve (as verifier)
const result = await sdk.scoreAndResolve(taskId, 90); // 90/100 score
console.log(`Payee receives: ${result.payeeAmount} MNEE`);
console.log(`Payer refund: ${result.refundAmount} MNEE`);

// Query task details
const task = await sdk.getTask(taskId);
console.log(task);
```

### Key SDK Methods

- `approveMnee(amount)` - Approve MNEE spending
- `getMneeBalance(address)` - Get MNEE balance
- `getMneeAllowance(owner)` - Check approval amount
- `createTask(payee, description, amount, timeout)` - Create task
- `submitDeliverable(taskId, hash)` - Submit work
- `scoreAndResolve(taskId, score)` - Resolve task
- `cancelTask(taskId, reason)` - Cancel task
- `getTask(taskId)` - Get task details

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Run coverage
npm run test:coverage
```

### Test Coverage

- ✅ Task creation (valid/invalid inputs)
- ✅ Deliverable submission
- ✅ Score and resolve (full/partial/zero payment)
- ✅ Cancellation flows
- ✅ Timeout handling
- ✅ Access control (roles)
- ✅ Edge cases (boundary scores)
- ✅ Gas benchmarks

## 🌐 Deployment

### Deployed Contracts

#### Ethereum Mainnet
- **MNEE Token**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **AgentEscrowMNEE**: _Deploy using instructions below_

#### Local/Testnet
For testing, the deployment script automatically deploys MockMNEE for local development.

#### Mainnet Fork (Recommended for Hackathon)
The best way to demonstrate MNEE integration:
```bash
npm run node:fork     # Terminal 1: Fork mainnet locally
npm run deploy:local  # Terminal 2: Deploy escrow (uses real MNEE)
npm run demo          # Terminal 3: Run demo with actual MNEE contract
```

**Why fork mainnet?**
- ✅ Uses real MNEE contract address `0x8cced...`
- ✅ Proves on-chain integration without testnet hassles
- ✅ Deterministic and reliable for demos
- ✅ Perfect for judge evaluation

### Testnet (Sepolia)

```bash
# Configure .env
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Deploy
npm run deploy:sepolia
```

### Mainnet

```bash
# Configure .env with mainnet settings
# Contract will use official MNEE: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF

npm run deploy:mainnet
```

**Important**: The deployment script automatically:
- Uses the official MNEE token address on mainnet (chain ID 1) or when forked
- Deploys MockMNEE on testnets for testing
- Detects fork mode via `FORK_MAINNET=true` environment variable
- Saves deployment info to `deployments/{network}-deployment.json`
- Exports ABIs to the `sdk/` directory

## 📁 Project Structure

```
agentpay/
├── contracts/
│   ├── AgentEscrowMNEE.sol    # Main escrow contract
│   └── MockMNEE.sol           # Test token
├── test/
│   └── AgentEscrowMNEE.test.js # Comprehensive tests
├── scripts/
│   ├── deploy.js              # Deployment script
│   └── demo-scenario.js       # Demo runner
├── verifier/
│   └── server.js              # AI verification service
├── demo-nextjs/               # 🆕 Next.js web demo (recommended)
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # Server-side API routes
│   │   └── page.tsx          # Main demo page
│   ├── components/           # React components
│   ├── lib/                  # Utilities and contract ABIs
│   └── README.md             # Demo-specific documentation
├── web/
│   └── index.html             # Legacy web interface (MetaMask)
├── sdk/
│   ├── AgentPaySDK.js         # JavaScript SDK
│   └── AgentEscrowMNEE.abi.json
├── deployments/               # Deployment artifacts
├── hardhat.config.js
└── package.json
```

## 🔒 Security

- **ReentrancyGuard**: Prevents reentrancy attacks
- **AccessControl**: Role-based permissions for verifiers
- **SafeERC20**: Safe token transfers
- **Pausable**: Emergency circuit breaker
- **Input Validation**: Score range, amount limits
- **Timeout Protection**: Automatic refunds on deadline

### Audit Status
- [ ] Internal review complete
- [ ] External audit pending

## 🛣️ Roadmap

### Phase 1 (Current) ✅
- MNEE escrow contract
- AI verifier service
- Web UI demo

### Phase 2
- Multi-verifier consensus
- Milestone-based payments
- Agent reputation NFTs
- SDK for popular agent frameworks

### Phase 3
- Cross-chain support (L2s)
- Streaming payments
- Agent-to-agent credit lines
- DAO governance for verifier selection

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🔗 Links

- **Live Demo**: [AgentPay Demo](YOUR_VERCEL_URL_HERE)
- **Demo Video**: [Watch on YouTube](YOUR_DEMO_VIDEO_URL_HERE)
- **GitHub**: https://github.com/wildhash/agentpay
- **Contract (Mainnet MNEE)**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **MNEE**: https://mnee.io

### Demo Instructions for Judges

**🎬 Fastest Way: Watch the 2-minute video** → [Demo Video](YOUR_DEMO_VIDEO_URL_HERE)

**🌐 Try it live:** [Live Demo](YOUR_VERCEL_URL_HERE) (no installation required)

**💻 Run locally in 4 commands:**
```bash
git clone https://github.com/wildhash/agentpay.git && cd agentpay
npm install
npm run node &  # Start blockchain in background
npm run demo:full  # See complete flow with MNEE payments
```

**Expected output:** Task created → 100 MNEE escrowed → AI scores deliverable → 85 MNEE to payee + 15 MNEE refund to payer

---

## 📝 Devpost Submission Checklist

### Required Deliverables

- ✅ **Public Repository**: This repository is public and open source
- ✅ **Open Source License**: MIT License included (see [LICENSE](LICENSE))
- ✅ **README**: Comprehensive documentation with install/run instructions
- ✅ **Source Code**: All contracts, backend, frontend code included
- ✅ **Working Demo**:
  - Live URL: [Demo App](YOUR_VERCEL_URL_HERE)
  - Local demo: `npm run demo:full`
- ✅ **Demo Video**: [2-minute walkthrough](YOUR_DEMO_VIDEO_URL_HERE) showing:
  - Problem overview (agent payment challenges)
  - Live demo: Create task → Submit → Verify → Settle
  - MNEE integration (escrow, score-based split, settlement)
  - Event log with transaction hashes
  - Final balances showing payout + refund
- ✅ **MNEE Integration**: Native MNEE stablecoin for all payments

### One-Liner
AI-native payment infrastructure using MNEE stablecoin with smart contract escrow and LLM-powered quality verification for autonomous agent transactions.

### Description
AgentPay enables trustless payments between AI agents using MNEE stablecoin on Ethereum. When Agent A needs work done, they create a task and deposit MNEE into our escrow contract. Agent B completes the work and submits a deliverable. Our AI verifier (powered by Claude) evaluates the output quality and scores it 0-100. The contract automatically settles: if the score is 85/100, Agent B receives 85% of the payment and Agent A gets a 15% refund.

This eliminates the trust problem in agent-to-agent commerce. No more disputes, no more manual escrow releases, no more hoping the other party acts fairly. The AI judges objectively, and the blockchain executes atomically.

**Key Innovation:** Objective partial refunds via LLM scoring combined with instant on-chain settlement using programmable MNEE stablecoin.

### Tech Stack
- **Smart Contracts**: Solidity 0.8.20, OpenZeppelin, Hardhat
- **Token**: MNEE ERC-20 Stablecoin (0x8cced...)
- **AI Verifier**: Node.js, Express, Claude API
- **Frontend**: Vanilla JS, Tailwind CSS, ethers.js
- **Testing**: Chai, Hardhat Network Helpers

### Why MNEE?

**🎯 The Perfect Fit for Agent Payments:**

1. **USD Stability** - Agents need predictable costs. 100 MNEE = $100 always, not 0.05 ETH today and 0.04 ETH tomorrow.

2. **Programmable Money** - MNEE is an ERC-20 token that works perfectly with smart contracts. Our escrow can hold, split, and distribute MNEE based on AI-determined quality scores.

3. **Instant Settlement** - Once the AI scores a deliverable, the contract immediately transfers MNEE to both parties. No waiting, no manual intervention.

**Why autonomy matters:** Agents operate 24/7 without humans. They need payment rails that work autonomously - no bank hours, no manual approvals, just code.

**What's novel:** Traditional escrow is binary (release all or nothing). We enable **proportional settlements** - if work is 85% good, payer gets 15% back automatically. This is only possible with programmable money like MNEE.

### Use of MNEE

The contract uses MNEE as the **exclusive payment token** via:

**Deposit Flow:**
1. `MNEE.approve(escrow, amount)` - Payer authorizes escrow to spend their MNEE
2. `escrow.createTask()` - Creates task and calls `MNEE.transferFrom(payer, escrow, amount)`
3. MNEE locked in contract until resolution

**Settlement Flow:**
1. AI verifier scores deliverable (0-100)
2. Contract calculates: `payeeAmount = totalAmount × (score/100)`
3. `MNEE.transfer(payee, payeeAmount)` - Send payment to worker
4. `MNEE.transfer(payer, refundAmount)` - Send refund to buyer
5. Task marked resolved

**Technical Details:**
- Full ERC-20 allowance/approval flow for security
- 6 decimal precision matching USDC-style tokens
- SafeERC20 library for secure transfers
- Reentrancy guards and access control
- All MNEE transfers emit events for transparency

**Real-World Example:**
- Task: "Build authentication API" - 100 MNEE deposit
- Deliverable: Functional but lacks docs
- AI Score: 75/100
- Result: Developer gets 75 MNEE, buyer refunded 25 MNEE
- All automatic, all on-chain, all with MNEE

### Future Roadmap
1. Multi-agent consensus for dispute resolution
2. Streaming payments for long-running tasks
3. Cross-chain deployment (Arbitrum, Base, Optimism)
4. Integration with LangChain, AutoGPT, CrewAI
5. On-chain reputation system with soulbound tokens

---

Built with ❤️ for the autonomous agent economy
