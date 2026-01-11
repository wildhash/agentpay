const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * AgentPay SDK - Simple SDK for interacting with AgentEscrowMNEE contract
 * Uses MNEE ERC-20 stablecoin for payments
 */
class AgentPaySDK {
  constructor(providerUrl, contractAddress, mneeAddress, privateKey = null) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.contractAddress = contractAddress;
    this.mneeAddress = mneeAddress;
    
    // Load ABI for escrow contract
    const abiPath = path.join(__dirname, "AgentEscrowMNEE.abi.json");
    this.abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    
    // MNEE token ABI (standard ERC-20)
    this.mneeAbi = [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address, uint256) returns (bool)",
      "function approve(address, uint256) returns (bool)",
      "function allowance(address, address) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    // Setup signer if private key provided
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, this.abi, this.signer);
      this.mneeToken = new ethers.Contract(mneeAddress, this.mneeAbi, this.signer);
    } else {
      this.contract = new ethers.Contract(contractAddress, this.abi, this.provider);
      this.mneeToken = new ethers.Contract(mneeAddress, this.mneeAbi, this.provider);
    }
  }
  
  /**
   * Set signer for transactions
   */
  setSigner(privateKey) {
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(this.contractAddress, this.abi, this.signer);
    this.mneeToken = new ethers.Contract(this.mneeAddress, this.mneeAbi, this.signer);
  }
  
  /**
   * Get MNEE token decimals
   * @returns {Promise<number>}
   */
  async getMneeDecimals() {
    return await this.mneeToken.decimals();
  }
  
  /**
   * Get MNEE balance
   * @param {string} address - Address to check
   * @returns {Promise<string>} Balance in MNEE (formatted)
   */
  async getMneeBalance(address) {
    const decimals = await this.getMneeDecimals();
    const balance = await this.mneeToken.balanceOf(address);
    return ethers.formatUnits(balance, decimals);
  }
  
  /**
   * Approve MNEE spending for the escrow contract
   * @param {string} amount - Amount in MNEE to approve (or "max" for unlimited)
   * @returns {Promise<{txHash: string}>}
   */
  async approveMnee(amount) {
    if (!this.signer) {
      throw new Error("Signer required for approving MNEE");
    }
    
    const decimals = await this.getMneeDecimals();
    const approvalAmount = amount === "max" 
      ? ethers.MaxUint256 
      : ethers.parseUnits(amount.toString(), decimals);
    
    const tx = await this.mneeToken.approve(this.contractAddress, approvalAmount);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash
    };
  }
  
  /**
   * Check MNEE allowance
   * @param {string} owner - Owner address
   * @returns {Promise<string>} Allowance in MNEE (formatted)
   */
  async getMneeAllowance(owner) {
    const decimals = await this.getMneeDecimals();
    const allowance = await this.mneeToken.allowance(owner, this.contractAddress);
    return ethers.formatUnits(allowance, decimals);
  }
  
  /**
   * Create a new task with MNEE deposit
   * @param {string} payeeAddress - Address of the payee agent
   * @param {string} description - Task description
   * @param {string} amountMnee - Amount in MNEE
   * @param {number} customTimeout - Custom timeout in seconds (0 for default)
   * @returns {Promise<{taskId: number, txHash: string}>}
   */
  async createTask(payeeAddress, description, amountMnee, customTimeout = 0) {
    if (!this.signer) {
      throw new Error("Signer required for creating tasks");
    }
    
    // Parse amount with proper decimals
    const decimals = await this.getMneeDecimals();
    const amount = ethers.parseUnits(amountMnee.toString(), decimals);
    
    // Check allowance
    const allowance = await this.mneeToken.allowance(await this.signer.getAddress(), this.contractAddress);
    if (allowance < amount) {
      throw new Error(`Insufficient MNEE allowance. Please approve at least ${amountMnee} MNEE first.`);
    }
    
    const tx = await this.contract.createTask(payeeAddress, description, amount, customTimeout);
    const receipt = await tx.wait();
    
    // Find TaskCreated event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed && parsed.name === "TaskCreated";
      } catch (e) {
        return false;
      }
    });
    
    if (!event) {
      throw new Error("TaskCreated event not found");
    }
    
    const parsedEvent = this.contract.interface.parseLog(event);
    const taskId = parsedEvent.args[0]; // taskId is first indexed parameter
    
    return {
      taskId: Number(taskId),
      txHash: receipt.hash
    };
  }
  
  /**
   * Submit deliverable for a task
   * @param {number} taskId - Task ID
   * @param {string} deliverableHash - Hash reference (e.g., IPFS hash)
   * @returns {Promise<{txHash: string}>}
   */
  async submitDeliverable(taskId, deliverableHash) {
    if (!this.signer) {
      throw new Error("Signer required for submitting deliverables");
    }
    
    const tx = await this.contract.submitDeliverable(taskId, deliverableHash);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash
    };
  }
  
  /**
   * Score and resolve a task (verifier only)
   * @param {number} taskId - Task ID
   * @param {number} score - Score from 0-100
   * @returns {Promise<{txHash: string, payeeAmount: string, refundAmount: string}>}
   */
  async scoreAndResolve(taskId, score) {
    if (!this.signer) {
      throw new Error("Signer required for scoring tasks");
    }
    
    if (score < 0 || score > 100) {
      throw new Error("Score must be between 0 and 100");
    }
    
    const tx = await this.contract.scoreAndResolve(taskId, score);
    const receipt = await tx.wait();
    
    // Find TaskResolved event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed && parsed.name === "TaskResolved";
      } catch (e) {
        return false;
      }
    });
    
    let payeeAmount = "0";
    let refundAmount = "0";
    
    if (event) {
      const parsedEvent = this.contract.interface.parseLog(event);
      const decimals = await this.getMneeDecimals();
      payeeAmount = ethers.formatUnits(parsedEvent.args.payeeAmount, decimals);
      refundAmount = ethers.formatUnits(parsedEvent.args.refundAmount, decimals);
    }
    
    return {
      txHash: receipt.hash,
      payeeAmount,
      refundAmount
    };
  }
  
  /**
   * Cancel a task (payer only, before submission)
   * @param {number} taskId - Task ID
   * @param {string} reason - Reason for cancellation
   * @returns {Promise<{txHash: string}>}
   */
  async cancelTask(taskId, reason = "Cancelled by payer") {
    if (!this.signer) {
      throw new Error("Signer required for cancelling tasks");
    }
    
    const tx = await this.contract.cancelTask(taskId, reason);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash
    };
  }
  
  /**
   * Get task details
   * @param {number} taskId - Task ID
   * @returns {Promise<Object>}
   */
  async getTask(taskId) {
    const task = await this.contract.getTask(taskId);
    const decimals = await this.getMneeDecimals();
    
    return {
      payer: task.payer,
      payee: task.payee,
      amount: ethers.formatUnits(task.amount, decimals),
      description: task.description,
      deliverableHash: task.deliverableHash,
      score: Number(task.score),
      status: this._getStatusString(task.status),
      createdAt: Number(task.createdAt),
      submittedAt: Number(task.submittedAt),
      timeout: Number(task.timeout),
      payeeAmount: ethers.formatUnits(task.payeeAmount, decimals),
      refundAmount: ethers.formatUnits(task.refundAmount, decimals)
    };
  }
  
  /**
   * Get balance of an address (ETH balance, not MNEE)
   * @param {string} address - Ethereum address
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance(address) {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }
  
  /**
   * Listen to contract events
   * @param {string} eventName - Event name
   * @param {function} callback - Callback function
   */
  onEvent(eventName, callback) {
    this.contract.on(eventName, callback);
  }
  
  /**
   * Get past events
   * @param {string} eventName - Event name
   * @param {number} fromBlock - Starting block
   * @returns {Promise<Array>}
   */
  async getPastEvents(eventName, fromBlock = 0) {
    const filter = this.contract.filters[eventName]();
    const events = await this.contract.queryFilter(filter, fromBlock);
    
    return events.map(event => ({
      blockNumber: event.blockNumber,
      txHash: event.transactionHash,
      args: event.args
    }));
  }
  
  _getStatusString(status) {
    const statuses = ["Created", "Submitted", "Resolved", "Cancelled", "TimedOut"];
    return statuses[status] || "Unknown";
  }
}

module.exports = AgentPaySDK;
