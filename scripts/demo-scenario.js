const AgentPaySDK = require("../sdk/AgentPaySDK");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

/**
 * Demo Scenario: Payer agent buys a report, verifier scores, contract splits payout/refund
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log("=".repeat(60));
  console.log("AgentPay Demo Scenario");
  console.log("=".repeat(60));
  console.log();
  
  // Load deployment
  const deploymentPath = path.join(__dirname, "../deployments/localhost-deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment not found. Run 'npm run deploy:local' first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Contract Address:", deployment.contractAddress);
  console.log();
  
  // Setup test accounts (Hardhat default accounts)
  const payerKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Account #1
  const payeeKey = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; // Account #2
  const verifierKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Account #0 (deployer)
  
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const payerWallet = new ethers.Wallet(payerKey, provider);
  const payeeWallet = new ethers.Wallet(payeeKey, provider);
  const verifierWallet = new ethers.Wallet(verifierKey, provider);
  
  console.log("Actors:");
  console.log("- Payer Agent:", payerWallet.address);
  console.log("- Payee Agent:", payeeWallet.address);
  console.log("- AI Verifier:", verifierWallet.address);
  console.log();
  
  // Initialize SDKs for each actor
  const payerSDK = new AgentPaySDK("http://127.0.0.1:8545", deployment.contractAddress, payerKey);
  const payeeSDK = new AgentPaySDK("http://127.0.0.1:8545", deployment.contractAddress, payeeKey);
  const verifierSDK = new AgentPaySDK("http://127.0.0.1:8545", deployment.contractAddress, verifierKey);
  
  // Step 1: Check initial balances
  console.log("Step 1: Initial Balances");
  console.log("-".repeat(60));
  const payerBalanceBefore = await payerSDK.getBalance(payerWallet.address);
  const payeeBalanceBefore = await payeeSDK.getBalance(payeeWallet.address);
  console.log(`Payer balance: ${parseFloat(payerBalanceBefore).toFixed(4)} ETH`);
  console.log(`Payee balance: ${parseFloat(payeeBalanceBefore).toFixed(4)} ETH`);
  console.log();
  
  await sleep(1000);
  
  // Step 2: Payer creates task
  console.log("Step 2: Payer Agent Creates Task");
  console.log("-".repeat(60));
  const taskAmount = "0.1"; // 0.1 ETH
  const taskDescription = "Comprehensive market research report on AI agent economy";
  
  console.log(`Creating task: "${taskDescription}"`);
  console.log(`Payment amount: ${taskAmount} ETH`);
  
  const createResult = await payerSDK.createTask(payeeWallet.address, taskDescription, taskAmount);
  const taskId = createResult.taskId;
  
  console.log(`✓ Task created with ID: ${taskId}`);
  console.log(`  Transaction: ${createResult.txHash}`);
  console.log();
  
  await sleep(1000);
  
  // Step 3: Check task status
  console.log("Step 3: Task Status");
  console.log("-".repeat(60));
  let task = await payerSDK.getTask(taskId);
  console.log(`Task ID: ${taskId}`);
  console.log(`Status: ${task.status}`);
  console.log(`Amount: ${task.amount} ETH`);
  console.log(`Payer: ${task.payer}`);
  console.log(`Payee: ${task.payee}`);
  console.log();
  
  await sleep(1000);
  
  // Step 4: Payee submits deliverable
  console.log("Step 4: Payee Agent Submits Deliverable");
  console.log("-".repeat(60));
  const deliverableHash = "ipfs://QmX7K8VbZjq3kN9v8PdZjL2MnWpY5xRtH4fQwE3bNcDaVf";
  
  console.log(`Submitting deliverable: ${deliverableHash}`);
  
  const submitResult = await payeeSDK.submitDeliverable(taskId, deliverableHash);
  console.log(`✓ Deliverable submitted`);
  console.log(`  Transaction: ${submitResult.txHash}`);
  console.log();
  
  await sleep(1000);
  
  // Step 5: Updated task status
  console.log("Step 5: Updated Task Status");
  console.log("-".repeat(60));
  task = await payerSDK.getTask(taskId);
  console.log(`Task ID: ${taskId}`);
  console.log(`Status: ${task.status}`);
  console.log(`Deliverable: ${task.deliverableHash}`);
  console.log();
  
  await sleep(1000);
  
  // Step 6: AI Verifier scores and resolves
  console.log("Step 6: AI Verifier Scores and Resolves");
  console.log("-".repeat(60));
  
  // Simulate AI scoring
  console.log("AI analyzing deliverable...");
  await sleep(2000);
  
  const score = 85; // High quality deliverable
  console.log(`AI Score: ${score}/100`);
  console.log(`Quality Assessment: Excellent`);
  console.log();
  
  console.log("Resolving payment on blockchain...");
  const resolveResult = await verifierSDK.scoreAndResolve(taskId, score);
  
  console.log(`✓ Task resolved`);
  console.log(`  Transaction: ${resolveResult.txHash}`);
  console.log(`  Payee receives: ${resolveResult.payeeAmount} ETH (${score}%)`);
  console.log(`  Refund to payer: ${resolveResult.refundAmount} ETH (${100-score}%)`);
  console.log();
  
  await sleep(1000);
  
  // Step 7: Final task status
  console.log("Step 7: Final Task Status");
  console.log("-".repeat(60));
  task = await payerSDK.getTask(taskId);
  console.log(`Task ID: ${taskId}`);
  console.log(`Status: ${task.status}`);
  console.log(`Score: ${task.score}/100`);
  console.log(`Resolved: ${task.resolved}`);
  console.log();
  
  await sleep(1000);
  
  // Step 8: Final balances
  console.log("Step 8: Final Balances");
  console.log("-".repeat(60));
  const payerBalanceAfter = await payerSDK.getBalance(payerWallet.address);
  const payeeBalanceAfter = await payeeSDK.getBalance(payeeWallet.address);
  
  const payerChange = parseFloat(payerBalanceAfter) - parseFloat(payerBalanceBefore);
  const payeeChange = parseFloat(payeeBalanceAfter) - parseFloat(payeeBalanceBefore);
  
  console.log(`Payer balance: ${parseFloat(payerBalanceAfter).toFixed(4)} ETH (${payerChange > 0 ? '+' : ''}${payerChange.toFixed(4)} ETH)`);
  console.log(`Payee balance: ${parseFloat(payeeBalanceAfter).toFixed(4)} ETH (${payeeChange > 0 ? '+' : ''}${payeeChange.toFixed(4)} ETH)`);
  console.log();
  
  // Summary
  console.log("=".repeat(60));
  console.log("Demo Summary");
  console.log("=".repeat(60));
  console.log(`✓ Task created and funded with ${taskAmount} ETH`);
  console.log(`✓ Payee submitted deliverable`);
  console.log(`✓ AI verifier scored deliverable: ${score}/100`);
  console.log(`✓ Smart contract automatically split payment:`);
  console.log(`  - ${score}% to payee (${resolveResult.payeeAmount} ETH)`);
  console.log(`  - ${100-score}% refunded to payer (${resolveResult.refundAmount} ETH)`);
  console.log();
  console.log("Demo completed successfully! 🎉");
  console.log("=".repeat(60));
}

if (require.main === module) {
  runDemo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error running demo:", error);
      process.exit(1);
    });
}

module.exports = runDemo;
