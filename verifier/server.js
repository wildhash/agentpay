const express = require("express");
const cors = require("cors");
const AgentPaySDK = require("../sdk/AgentPaySDK");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Load deployment info
function loadDeployment(network = "localhost") {
  const deploymentPath = path.join(__dirname, "../deployments", `${network}-deployment.json`);
  if (fs.existsSync(deploymentPath)) {
    return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }
  return null;
}

/**
 * AI Verifier Service
 * Scores deliverables (0-100) and triggers automatic resolution
 */
class AIVerifier {
  constructor(sdk) {
    this.sdk = sdk;
  }
  
  /**
   * Simulate AI scoring of deliverable
   * In production, this would use actual AI/ML models
   * @param {string} deliverableHash - Hash reference to deliverable
   * @param {string} taskDescription - Original task description
   * @returns {number} Score from 0-100
   */
  async scoreDeliverable(deliverableHash, taskDescription) {
    console.log(`Scoring deliverable: ${deliverableHash}`);
    console.log(`Task description: ${taskDescription}`);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple heuristic scoring for demo
    // In production, this would be replaced with actual AI model
    let score = 50; // Base score
    
    // Check if deliverable hash looks valid (longer = better)
    if (deliverableHash.length > 20) {
      score += 20;
    }
    
    // Add some randomness to simulate AI uncertainty
    score += Math.floor(Math.random() * 30);
    
    // Cap at 100
    score = Math.min(score, 100);
    
    console.log(`Computed score: ${score}`);
    
    return score;
  }
  
  /**
   * Verify and resolve a task
   * @param {number} taskId - Task ID
   * @returns {Promise<Object>}
   */
  async verifyAndResolve(taskId) {
    try {
      // Get task details
      const task = await this.sdk.getTask(taskId);
      
      if (task.status !== "Submitted") {
        throw new Error(`Task ${taskId} is not in Submitted status`);
      }
      
      // Score the deliverable
      const score = await this.scoreDeliverable(task.deliverableHash, task.description);
      
      // Resolve on blockchain
      const result = await this.sdk.scoreAndResolve(taskId, score);
      
      console.log(`Task ${taskId} resolved with score ${score}`);
      console.log(`Payee receives: ${result.payeeAmount} ETH`);
      console.log(`Refund to payer: ${result.refundAmount} ETH`);
      
      return {
        taskId,
        score,
        ...result
      };
    } catch (error) {
      console.error(`Error verifying task ${taskId}:`, error.message);
      throw error;
    }
  }
}

// Initialize
let verifier = null;
let sdk = null;

const PORT = process.env.VERIFIER_PORT || 3001;

// API Endpoints
app.post("/verify/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (!verifier) {
      return res.status(503).json({ error: "Verifier not initialized" });
    }
    
    const result = await verifier.verifyAndResolve(taskId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/task/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (!sdk) {
      return res.status(503).json({ error: "SDK not initialized" });
    }
    
    const task = await sdk.getTask(taskId);
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    initialized: !!verifier,
    timestamp: new Date().toISOString()
  });
});

// Startup
async function startVerifier() {
  console.log("Starting AI Verifier Service...");
  
  // Load deployment
  const deployment = loadDeployment("localhost");
  if (!deployment) {
    console.error("No deployment found. Run 'npm run deploy:local' first.");
    process.exit(1);
  }
  
  console.log("Loaded deployment:", deployment.contractAddress);
  
  // Get verifier private key from environment or use a test key
  const verifierKey = process.env.VERIFIER_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  
  // Initialize SDK
  sdk = new AgentPaySDK(
    "http://127.0.0.1:8545",
    deployment.contractAddress,
    verifierKey
  );
  
  verifier = new AIVerifier(sdk);
  
  app.listen(PORT, () => {
    console.log(`AI Verifier Service running on port ${PORT}`);
    console.log(`Contract: ${deployment.contractAddress}`);
  });
}

if (require.main === module) {
  startVerifier().catch(console.error);
}

module.exports = { AIVerifier };
