# 🤖 AgentPay — AI-Native Payments with MNEE

[![Hackathon](https://img.shields.io/badge/MNEE-Hackathon-purple)](https://mnee.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **Trustless escrow + AI verification + instant partial/full refunds for autonomous agents**

AgentPay is a decentralized payment infrastructure built for the autonomous agent economy. Using MNEE stablecoin on Ethereum, it enables AI agents to transact trustlessly with automatic quality-based settlements.

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

# Copy environment file
cp .env.example .env
```

### Run Demo (Local)

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
npm run verifier

# Web UI (port 8080)
npm run web
```

Then open http://localhost:8080 and connect MetaMask!

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
- Uses the official MNEE token address on mainnet (chain ID 1)
- Deploys MockMNEE on testnets for testing
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
├── web/
│   └── index.html             # Web interface
├── sdk/
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

- **Demo**: [Live Demo](http://localhost:8080)
- **Contract (Mainnet MNEE)**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **GitHub**: https://github.com/wildhash/agentpay
- **MNEE**: https://mnee.io

---

## 📝 Devpost Submission

### One-Liner
AI-native payment infrastructure using MNEE stablecoin with smart contract escrow and LLM-powered quality verification for autonomous agent transactions.

### Description
AgentPay enables trustless payments between AI agents using MNEE stablecoin on Ethereum. When Agent A needs work done, they create a task and deposit MNEE into our escrow contract. Agent B completes the work and submits a deliverable. Our AI verifier (powered by Claude) evaluates the output quality and scores it 0-100. The contract automatically settles: if the score is 85/100, Agent B receives 85% of the payment and Agent A gets a 15% refund.

This eliminates the trust problem in agent-to-agent commerce. No more disputes, no more manual escrow releases, no more hoping the other party acts fairly. The AI judges objectively, and the blockchain executes atomically.

### Tech Stack
- **Smart Contracts**: Solidity 0.8.20, OpenZeppelin, Hardhat
- **Token**: MNEE ERC-20 Stablecoin (0x8cced...)
- **AI Verifier**: Node.js, Express, Claude API
- **Frontend**: Vanilla JS, Tailwind CSS, ethers.js
- **Testing**: Chai, Hardhat Network Helpers

### Use of MNEE
The contract uses MNEE as the exclusive payment token via:
- `IERC20.transferFrom()` for deposits
- `IERC20.transfer()` for settlements
- Full ERC-20 allowance/approval flow
- 6 decimal precision matching USDC-style tokens

### Future Roadmap
1. Multi-agent consensus for dispute resolution
2. Streaming payments for long-running tasks
3. Cross-chain deployment (Arbitrum, Base, Optimism)
4. Integration with LangChain, AutoGPT, CrewAI
5. On-chain reputation system with soulbound tokens

---

Built with ❤️ for the autonomous agent economy
