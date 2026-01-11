/**
 * AgentPay AI Verifier Service
 * 
 * Intelligent verification service that uses LLM to score deliverables
 * based on task specifications. Outputs structured reasoning for transparency.
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many requests, please try again later' }
});
app.use('/verify', limiter);

// ============ Configuration ============
const PORT = process.env.VERIFIER_PORT || 3001;
const PROVIDER_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MOCK_VERIFIER = process.env.MOCK_VERIFIER === 'true';

// Contract ABI (minimal for verification)
const ESCROW_ABI = [
  "function getTask(uint256 taskId) view returns (tuple(address payer, address payee, uint256 amount, string description, string deliverableHash, uint8 score, uint8 status, uint256 createdAt, uint256 submittedAt, uint256 timeout, uint256 payeeAmount, uint256 refundAmount))",
  "function scoreAndResolve(uint256 taskId, uint8 score)",
  "event TaskScored(uint256 indexed taskId, uint8 score, address indexed verifier)",
  "event TaskResolved(uint256 indexed taskId, uint256 payeeAmount, uint256 refundAmount, uint8 score)"
];

// ============ Blockchain Setup ============
let provider, wallet, contract;

function initBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    if (VERIFIER_PRIVATE_KEY) {
      wallet = new ethers.Wallet(VERIFIER_PRIVATE_KEY, provider);
      if (CONTRACT_ADDRESS) {
        contract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, wallet);
      }
    }
    console.log('✓ Blockchain connection initialized');
  } catch (error) {
    console.error('⚠ Blockchain init failed:', error.message);
  }
}

// ============ LLM Scoring Engine ============

/**
 * Score a deliverable using Claude API
 */
async function scoreWithClaude(taskDescription, deliverableContent) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const prompt = buildScoringPrompt(taskDescription, deliverableContent);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return parseScoreResponse(data.content[0].text);
}

/**
 * Score a deliverable using OpenAI API (fallback)
 */
async function scoreWithOpenAI(taskDescription, deliverableContent) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = buildScoringPrompt(taskDescription, deliverableContent);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return parseScoreResponse(data.choices[0].message.content);
}

/**
 * Build the scoring prompt
 */
function buildScoringPrompt(taskDescription, deliverableContent) {
  return `You are an AI quality assessor for an autonomous agent payment system. Your job is to objectively score a deliverable against its task specification.

## Task Specification
${taskDescription}

## Submitted Deliverable
${deliverableContent}

## Scoring Criteria
Score the deliverable from 0-100 based on:
- **Completeness (0-30)**: Does it address all requirements?
- **Quality (0-30)**: Is the work well-executed and professional?
- **Accuracy (0-25)**: Is the content correct and error-free?
- **Relevance (0-15)**: Does it directly address the task?

## Response Format
Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "breakdown": {
    "completeness": <number 0-30>,
    "quality": <number 0-30>,
    "accuracy": <number 0-25>,
    "relevance": <number 0-15>
  },
  "reasoning": "<brief explanation of the score>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}

Be fair but strict. A score of 70+ indicates the work meets acceptable standards.`;
}

/**
 * Parse the LLM response and extract score
 */
function parseScoreResponse(responseText) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Validate score
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error('Invalid score value');
    }

    return {
      score: Math.round(result.score),
      breakdown: result.breakdown || {},
      reasoning: result.reasoning || 'No reasoning provided',
      strengths: result.strengths || [],
      improvements: result.improvements || []
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', error.message);
    console.error('Raw response:', responseText);
    
    // Fallback: try to extract just a number
    const numberMatch = responseText.match(/\b(\d{1,3})\b/);
    if (numberMatch) {
      const score = parseInt(numberMatch[1]);
      if (score >= 0 && score <= 100) {
        return {
          score,
          breakdown: {},
          reasoning: 'Fallback scoring used',
          strengths: [],
          improvements: []
        };
      }
    }
    
    throw new Error('Could not parse score from LLM response');
  }
}

/**
 * Fetch deliverable content from IPFS or other sources
 */
async function fetchDeliverable(deliverableHash) {
  // Support multiple formats
  if (deliverableHash.startsWith('ipfs://')) {
    const cid = deliverableHash.replace('ipfs://', '');
    const gateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`
    ];
    
    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, { timeout: 10000 });
        if (response.ok) {
          const content = await response.text();
          return content.substring(0, 10000); // Limit content size
        }
      } catch (error) {
        continue;
      }
    }
    throw new Error('Could not fetch from IPFS');
  }
  
  if (deliverableHash.startsWith('http://') || deliverableHash.startsWith('https://')) {
    const response = await fetch(deliverableHash, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const content = await response.text();
    return content.substring(0, 10000);
  }
  
  // Assume it's inline content
  return deliverableHash;
}

/**
 * Main scoring function
 */
async function scoreDeliverable(taskDescription, deliverableHash) {
  // Fetch deliverable content
  let deliverableContent;
  try {
    deliverableContent = await fetchDeliverable(deliverableHash);
  } catch (error) {
    console.warn('Could not fetch deliverable, using hash as content:', error.message);
    deliverableContent = deliverableHash;
  }

  // Try Claude first, then OpenAI
  let result;
  try {
    if (MOCK_VERIFIER) {
      // Mock mode: use deterministic scoring
      result = simulateScoring(taskDescription, deliverableContent);
      result.model = 'mock';
    } else if (ANTHROPIC_API_KEY) {
      result = await scoreWithClaude(taskDescription, deliverableContent);
      result.model = 'claude';
    } else if (OPENAI_API_KEY) {
      result = await scoreWithOpenAI(taskDescription, deliverableContent);
      result.model = 'gpt-4o';
    } else {
      // Demo mode: simulated scoring
      result = simulateScoring(taskDescription, deliverableContent);
      result.model = 'simulated';
    }
  } catch (error) {
    console.error('LLM scoring failed:', error.message);
    // Fallback to simulated scoring
    result = simulateScoring(taskDescription, deliverableContent);
    result.model = 'simulated';
    result.error = error.message;
  }

  return result;
}

/**
 * Simulated scoring for demo/testing
 */
function simulateScoring(taskDescription, deliverableContent) {
  // Simple heuristic scoring for demos
  let score = 70; // Base score
  
  // Length bonus
  if (deliverableContent.length > 100) score += 5;
  if (deliverableContent.length > 500) score += 5;
  if (deliverableContent.length > 1000) score += 5;
  
  // Keyword matching
  const taskWords = taskDescription.toLowerCase().split(/\s+/);
  const contentWords = deliverableContent.toLowerCase().split(/\s+/);
  const matches = taskWords.filter(w => contentWords.includes(w)).length;
  score += Math.min(matches * 2, 10);
  
  // Cap at 100
  score = Math.min(score, 100);
  
  return {
    score,
    breakdown: {
      completeness: Math.round(score * 0.3),
      quality: Math.round(score * 0.3),
      accuracy: Math.round(score * 0.25),
      relevance: Math.round(score * 0.15)
    },
    reasoning: 'Simulated scoring based on content analysis',
    strengths: ['Deliverable submitted', 'Content present'],
    improvements: ['Consider using LLM scoring for production']
  };
}

// ============ API Routes ============

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: MOCK_VERIFIER ? 'mock' : (ANTHROPIC_API_KEY || OPENAI_API_KEY ? 'ai' : 'simulated'),
    config: {
      blockchain: !!contract,
      claude: !!ANTHROPIC_API_KEY,
      openai: !!OPENAI_API_KEY,
      mock: MOCK_VERIFIER,
      contractAddress: CONTRACT_ADDRESS || 'not configured'
    }
  });
});

/**
 * Score a deliverable (dry run)
 */
app.post('/score', async (req, res) => {
  try {
    const { taskDescription, deliverableHash, deliverableContent } = req.body;

    if (!taskDescription) {
      return res.status(400).json({ error: 'taskDescription required' });
    }
    if (!deliverableHash && !deliverableContent) {
      return res.status(400).json({ error: 'deliverableHash or deliverableContent required' });
    }

    const result = await scoreDeliverable(
      taskDescription,
      deliverableContent || deliverableHash
    );

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

    // Log for audit
    console.log(JSON.stringify({
      action: 'score',
      taskDescription: taskDescription.substring(0, 100),
      ...result,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Scoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify and resolve a task on-chain
 */
app.post('/verify/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not configured' });
    }

    // Get task from contract
    const task = await contract.getTask(taskId);
    
    if (task.status !== 1n) { // 1 = Submitted
      return res.status(400).json({ 
        error: 'Task not in submitted state',
        currentStatus: Number(task.status)
      });
    }

    // Score the deliverable
    const result = await scoreDeliverable(task.description, task.deliverableHash);

    // Submit score to blockchain
    console.log(`Submitting score ${result.score} for task ${taskId}...`);
    const tx = await contract.scoreAndResolve(taskId, result.score);
    const receipt = await tx.wait();

    // Calculate amounts
    const amount = task.amount;
    const payeeAmount = (amount * BigInt(result.score)) / 100n;
    const refundAmount = amount - payeeAmount;

    res.json({
      success: true,
      taskId,
      score: result.score,
      reasoning: result.reasoning,
      breakdown: result.breakdown,
      model: result.model,
      payeeAmount: ethers.formatUnits(payeeAmount, 6) + ' MNEE',
      refundAmount: ethers.formatUnits(refundAmount, 6) + ' MNEE',
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString()
    });

    // Log for audit
    console.log(JSON.stringify({
      action: 'verify',
      taskId,
      score: result.score,
      txHash: receipt.hash,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get task info
 */
app.get('/task/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not configured' });
    }

    const task = await contract.getTask(taskId);
    
    const statusMap = ['Created', 'Submitted', 'Resolved', 'Cancelled', 'TimedOut'];
    
    res.json({
      taskId,
      payer: task.payer,
      payee: task.payee,
      amount: ethers.formatUnits(task.amount, 6) + ' MNEE',
      description: task.description,
      deliverableHash: task.deliverableHash,
      score: Number(task.score),
      status: statusMap[Number(task.status)],
      createdAt: new Date(Number(task.createdAt) * 1000).toISOString(),
      submittedAt: task.submittedAt > 0 ? new Date(Number(task.submittedAt) * 1000).toISOString() : null,
      payeeAmount: ethers.formatUnits(task.payeeAmount, 6) + ' MNEE',
      refundAmount: ethers.formatUnits(task.refundAmount, 6) + ' MNEE'
    });

  } catch (error) {
    console.error('Task fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Batch score multiple deliverables
 */
app.post('/batch-score', async (req, res) => {
  try {
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks array required' });
    }
    
    if (tasks.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 tasks per batch' });
    }

    const results = await Promise.all(
      tasks.map(async (task, index) => {
        try {
          const result = await scoreDeliverable(
            task.taskDescription,
            task.deliverableContent || task.deliverableHash
          );
          return { index, success: true, ...result };
        } catch (error) {
          return { index, success: false, error: error.message };
        }
      })
    );

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch scoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Start Server ============
initBlockchain();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           AgentPay AI Verifier Service                   ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║  Contract: ${CONTRACT_ADDRESS ? CONTRACT_ADDRESS.substring(0,20) + '...' : 'Not configured'}                   ║
║  Mode: ${MOCK_VERIFIER ? 'MOCK (Deterministic)' : ANTHROPIC_API_KEY ? 'Claude AI' : OPENAI_API_KEY ? 'OpenAI GPT-4' : 'Simulated'}                              ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║    GET  /health           - Service health check         ║
║    POST /score            - Score deliverable (dry run)  ║
║    POST /verify/:taskId   - Verify and resolve on-chain  ║
║    GET  /task/:taskId     - Get task details            ║
║    POST /batch-score      - Batch score multiple tasks   ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
