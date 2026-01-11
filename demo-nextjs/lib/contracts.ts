// Contract ABIs and utilities for AgentPay Demo

export const ESCROW_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_payee", "type": "address"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "uint256", "name": "_amount", "type": "uint256"},
      {"internalType": "uint256", "name": "_customTimeout", "type": "uint256"}
    ],
    "name": "createTask",
    "outputs": [{"internalType": "uint256", "name": "taskId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_taskId", "type": "uint256"},
      {"internalType": "string", "name": "_deliverableHash", "type": "string"}
    ],
    "name": "submitDeliverable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_taskId", "type": "uint256"},
      {"internalType": "uint8", "name": "_score", "type": "uint8"}
    ],
    "name": "scoreAndResolve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_taskId", "type": "uint256"}],
    "name": "getTask",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "payer", "type": "address"},
          {"internalType": "address", "name": "payee", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "string", "name": "deliverableHash", "type": "string"},
          {"internalType": "uint8", "name": "score", "type": "uint8"},
          {"internalType": "enum AgentEscrowMNEE.TaskStatus", "name": "status", "type": "uint8"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "uint256", "name": "submittedAt", "type": "uint256"},
          {"internalType": "uint256", "name": "timeout", "type": "uint256"},
          {"internalType": "uint256", "name": "payeeAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "refundAmount", "type": "uint256"}
        ],
        "internalType": "struct AgentEscrowMNEE.Task",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "taskCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "taskId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "payer", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "payee", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "description", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "timeout", "type": "uint256"}
    ],
    "name": "TaskCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "taskId", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "deliverableHash", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "submittedAt", "type": "uint256"}
    ],
    "name": "TaskSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "taskId", "type": "uint256"},
      {"indexed": false, "internalType": "uint8", "name": "score", "type": "uint8"},
      {"indexed": true, "internalType": "address", "name": "verifier", "type": "address"}
    ],
    "name": "TaskScored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "taskId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "payeeAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "refundAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint8", "name": "score", "type": "uint8"}
    ],
    "name": "TaskResolved",
    "type": "event"
  }
] as const;

export const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface TaskStatus {
  Created: 0;
  Submitted: 1;
  Resolved: 2;
  Cancelled: 3;
  TimedOut: 4;
}

export const TASK_STATUS: TaskStatus = {
  Created: 0,
  Submitted: 1,
  Resolved: 2,
  Cancelled: 3,
  TimedOut: 4
};

export const TASK_STATUS_NAMES = ['Created', 'Submitted', 'Resolved', 'Cancelled', 'TimedOut'];
