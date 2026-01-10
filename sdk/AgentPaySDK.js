const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * AgentPay SDK - Simple SDK for interacting with AgentEscrow contract
 */
class AgentPaySDK {
  constructor(providerUrl, contractAddress, privateKey = null) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.contractAddress = contractAddress;
    
    // Load ABI
    const abiPath = path.join(__dirname, "AgentEscrow.abi.json");
    this.abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    
    // Setup signer if private key provided
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, this.abi, this.signer);
    } else {
      this.contract = new ethers.Contract(contractAddress, this.abi, this.provider);
    }
  }
  
  /**
   * Set signer for transactions
   */
  setSigner(privateKey) {
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(this.contractAddress, this.abi, this.signer);
  }
  
  /**
   * Create a new task
   * @param {string} payeeAddress - Address of the payee agent
   * @param {string} description - Task description
   * @param {string} amountEth - Amount in ETH
   * @returns {Promise<{taskId: number, txHash: string}>}
   */
  async createTask(payeeAddress, description, amountEth) {
    if (!this.signer) {
      throw new Error("Signer required for creating tasks");
    }
    
    const amountWei = ethers.parseEther(amountEth.toString());
    const tx = await this.contract.createTask(payeeAddress, description, {
      value: amountWei
    });
    
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
    const taskId = parsedEvent.args.taskId;
    
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
      payeeAmount = ethers.formatEther(parsedEvent.args.payeeAmount);
      refundAmount = ethers.formatEther(parsedEvent.args.refundAmount);
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
   * @returns {Promise<{txHash: string}>}
   */
  async cancelTask(taskId) {
    if (!this.signer) {
      throw new Error("Signer required for cancelling tasks");
    }
    
    const tx = await this.contract.cancelTask(taskId);
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
    
    return {
      payer: task[0],
      payee: task[1],
      amount: ethers.formatEther(task[2]),
      description: task[3],
      status: this._getStatusString(task[4]),
      createdAt: Number(task[5]),
      submittedAt: Number(task[6]),
      deliverableHash: task[7],
      score: Number(task[8]),
      resolved: task[9]
    };
  }
  
  /**
   * Get balance of an address
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
    const statuses = ["Created", "Submitted", "Resolved", "Cancelled"];
    return statuses[status] || "Unknown";
  }
}

module.exports = AgentPaySDK;
