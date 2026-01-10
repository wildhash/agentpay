# AgentPay (MNEE)

**AI-native payments with MNEE: escrow + verification + instant partial/full refunds for autonomous agents.**

AgentPay is a decentralized escrow system built on Ethereum that enables trustless payments between autonomous agents. It features an AI verifier service that scores deliverables (0-100) and triggers automatic full or partial refunds/releases based on quality assessment.

## 🌟 Features

- **Smart Contract Escrow**: Secure fund locking with AgentEscrow.sol
- **AI Verification**: Automated deliverable scoring (0-100)
- **Partial Refunds**: Proportional payment splitting based on quality
- **Agent-to-Agent**: Designed for autonomous agent interactions
- **Web Demo**: Visual interface for testing and monitoring
- **SDK**: Easy integration with TypeScript/JavaScript

## 📋 Architecture

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

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Python 3 (for web demo and Python SDK)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/wildhash/agentpay.git
cd agentpay

# Install dependencies
npm install

# (Optional) Install Python SDK dependencies
pip install -r requirements.txt
```

### Setup

```bash
# Copy environment example
cp .env.example .env

# Edit .env if needed (optional for local testing)
```

## 🧪 Testing Locally

### 1. Start Local Blockchain

In terminal 1:
```bash
npm run node
```

This starts a Hardhat local node with test accounts.

### 2. Deploy Contract

In terminal 2:
```bash
npm run deploy:local
```

This deploys the AgentEscrow contract to localhost.

### 3. Run Demo Scenario

```bash
npm run demo
```

This runs a complete demo:
- Payer agent creates a task with 0.1 ETH
- Payee agent submits deliverable
- AI verifier scores (85/100)
- Contract automatically splits: 85% to payee, 15% refund

### 4. Start Web Demo

In terminal 3:
```bash
npm run web
```

Open http://localhost:8080 in your browser to interact with the contract via web UI.

### 5. (Optional) Start AI Verifier Service

In terminal 4:
```bash
npm run verifier
```

This starts the AI verifier REST API on port 3001.

## 📁 Project Structure

```
agentpay/
├── contracts/
│   └── AgentEscrow.sol          # Main escrow smart contract
├── sdk/
│   ├── AgentPaySDK.js           # JavaScript SDK for interaction
│   └── AgentEscrow.abi.json     # Contract ABI (generated)
├── verifier/
│   └── server.js                # AI verifier service
├── scripts/
│   ├── deploy.js                # Deployment script
│   └── demo-scenario.js         # Demo scenario runner
├── web/
│   └── index.html               # Web demo interface
├── deployments/                 # Deployment info (generated)
├── hardhat.config.js            # Hardhat configuration
└── package.json                 # Dependencies and scripts
```

## 📖 Usage

### Using the JavaScript SDK

```javascript
const AgentPaySDK = require('./sdk/AgentPaySDK');

// Initialize SDK
const sdk = new AgentPaySDK(
  'http://127.0.0.1:8545',      // RPC URL
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',  // Contract address
  'your-private-key'             // Private key
);

// Create a task
const { taskId } = await sdk.createTask(
  '0xPayeeAddress',
  'Task description',
  '0.1'  // Amount in ETH
);

// Submit deliverable (as payee)
await sdk.submitDeliverable(taskId, 'ipfs://QmHash...');

// Score and resolve (as verifier)
await sdk.scoreAndResolve(taskId, 85);  // Score 0-100

// Get task details
const task = await sdk.getTask(taskId);
console.log(task);
```

### Using the Python SDK

```python
from sdk.AgentPaySDK import AgentPaySDK

# Initialize SDK
sdk = AgentPaySDK(
    provider_url='http://127.0.0.1:8545',
    contract_address='0x5FbDB2315678afecb367f032d93F642f64180aa3',
    private_key='your-private-key'
)

# Create a task
result = sdk.create_task(
    payee_address='0xPayeeAddress',
    description='Task description',
    amount_eth=0.1
)
task_id = result['taskId']

# Submit deliverable (as payee)
sdk.submit_deliverable(task_id, 'ipfs://QmHash...')

# Score and resolve (as verifier)
result = sdk.score_and_resolve(task_id, 85)
print(f"Payee receives: {result['payeeAmount']} ETH")
print(f"Refund: {result['refundAmount']} ETH")

# Get task details
task = sdk.get_task(task_id)
print(task)
```

### Using the Smart Contract Directly

```solidity
// Create task
AgentEscrow.createTask{value: 0.1 ether}(payeeAddress, "Task description");

// Submit deliverable
AgentEscrow.submitDeliverable(taskId, "ipfs://QmHash...");

// Score and resolve (verifier only)
AgentEscrow.scoreAndResolve(taskId, 85);
```

### Using the AI Verifier API

```bash
# Verify a task
curl -X POST http://localhost:3001/verify/0

# Get task info
curl http://localhost:3001/task/0

# Health check
curl http://localhost:3001/health
```

## 🌐 Deploy to Testnet (Sepolia)

### 1. Configure Environment

```bash
# Edit .env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### 2. Get Testnet ETH

Get Sepolia ETH from a faucet:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

### 3. Deploy

```bash
npm run deploy:sepolia
```

The deployment info will be saved to `deployments/sepolia-deployment.json`.

## 🔑 Key Concepts

### Task Lifecycle

1. **Created**: Payer creates task and deposits funds
2. **Submitted**: Payee submits deliverable
3. **Resolved**: Verifier scores and funds are distributed
4. **Cancelled**: Payer cancels before submission (full refund)

### Scoring System

- Score range: 0-100
- Payee receives: `(score / 100) * amount`
- Payer refund: `((100 - score) / 100) * amount`
- Example: 85/100 score on 0.1 ETH → 0.085 ETH to payee, 0.015 ETH refund

### AI Verifier

The AI verifier simulates quality assessment. In production, replace with:
- GPT-4/Claude for content quality
- Custom ML models for specific domains
- Multi-agent consensus scoring
- Human-in-the-loop verification

## 🧩 Smart Contract API

### Functions

- `createTask(address payee, string description) payable` - Create new task
- `submitDeliverable(uint256 taskId, string deliverableHash)` - Submit work
- `scoreAndResolve(uint256 taskId, uint8 score)` - Verify and resolve (verifier only)
- `cancelTask(uint256 taskId)` - Cancel task (payer only, before submission)
- `getTask(uint256 taskId)` - Get task details
- `updateVerifier(address newVerifier)` - Update verifier (owner only)

### Events

- `TaskCreated(taskId, payer, payee, amount, description)`
- `TaskSubmitted(taskId, deliverableHash)`
- `TaskScored(taskId, score)`
- `TaskResolved(taskId, payeeAmount, refundAmount)`
- `TaskCancelled(taskId, refundAmount)`

## 🛡️ Security Considerations

- Funds are locked in contract until resolution
- Only verifier can score tasks
- Only payer can cancel before submission
- Only payee can submit deliverables
- Reentrancy protection via transfer ordering
- Score validation (0-100)

## 🧪 Testing

```bash
# Compile contracts
npm run compile

# Run tests (when test files are added)
npm test
```

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT

## 🔗 Links

- Repository: https://github.com/wildhash/agentpay
- Documentation: See this README
- Issues: https://github.com/wildhash/agentpay/issues

## 💡 Future Enhancements

- Multi-token support (ERC-20)
- Milestone-based payments
- Dispute resolution mechanism
- Enhanced AI models
- Cross-chain support
- Governance for verifier selection
- Reputation system for agents
- Integration with existing AI agent frameworks

---

Built with ❤️ for the autonomous agent economy
