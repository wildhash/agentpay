/**
 * Simple example of using AgentPaySDK
 * This shows basic usage patterns
 */

const AgentPaySDK = require('../sdk/AgentPaySDK');
const fs = require('fs');
const path = require('path');

async function main() {
  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployments/localhost-deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('Deployment not found. Run "npm run deploy:local" first.');
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  console.log('AgentPaySDK Example\n');
  
  // Example 1: Read-only SDK (no private key)
  console.log('Example 1: Query contract state');
  console.log('-'.repeat(40));
  
  const readOnlySDK = new AgentPaySDK(
    'http://127.0.0.1:8545',
    deployment.contractAddress
  );
  
  // Try to get task 0 (may not exist yet)
  try {
    const task = await readOnlySDK.getTask(0);
    console.log('Task 0:', task);
  } catch (e) {
    console.log('No tasks found yet');
  }
  
  console.log();
  
  // Example 2: Create task with signer
  console.log('Example 2: Create a task');
  console.log('-'.repeat(40));
  
  // Use Hardhat's default test accounts
  const payerKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Account #1
  const payeeAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'; // Account #2
  
  const payerSDK = new AgentPaySDK(
    'http://127.0.0.1:8545',
    deployment.contractAddress,
    payerKey
  );
  
  console.log('Creating task with 0.05 ETH payment...');
  const { taskId, txHash } = await payerSDK.createTask(
    payeeAddress,
    'Example task: Analyze cryptocurrency market trends',
    '0.05'
  );
  
  console.log(`✓ Task created!`);
  console.log(`  Task ID: ${taskId}`);
  console.log(`  TX Hash: ${txHash}`);
  console.log();
  
  // Example 3: Query task
  console.log('Example 3: Query task details');
  console.log('-'.repeat(40));
  
  const task = await payerSDK.getTask(taskId);
  console.log('Task details:');
  console.log(`  ID: ${taskId}`);
  console.log(`  Status: ${task.status}`);
  console.log(`  Description: ${task.description}`);
  console.log(`  Amount: ${task.amount} ETH`);
  console.log(`  Payer: ${task.payer}`);
  console.log(`  Payee: ${task.payee}`);
  console.log();
  
  // Example 4: Submit deliverable
  console.log('Example 4: Submit deliverable');
  console.log('-'.repeat(40));
  
  const payeeKey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'; // Account #2
  const payeeSDK = new AgentPaySDK(
    'http://127.0.0.1:8545',
    deployment.contractAddress,
    payeeKey
  );
  
  console.log('Submitting deliverable...');
  const submitResult = await payeeSDK.submitDeliverable(
    taskId,
    'ipfs://QmExample123456789'
  );
  
  console.log(`✓ Deliverable submitted!`);
  console.log(`  TX Hash: ${submitResult.txHash}`);
  console.log();
  
  // Example 5: Score and resolve
  console.log('Example 5: Score and resolve (as verifier)');
  console.log('-'.repeat(40));
  
  const verifierKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account #0
  const verifierSDK = new AgentPaySDK(
    'http://127.0.0.1:8545',
    deployment.contractAddress,
    verifierKey
  );
  
  const score = 90; // High quality
  console.log(`Scoring deliverable: ${score}/100`);
  
  const resolveResult = await verifierSDK.scoreAndResolve(taskId, score);
  
  console.log(`✓ Task resolved!`);
  console.log(`  TX Hash: ${resolveResult.txHash}`);
  console.log(`  Payee receives: ${resolveResult.payeeAmount} ETH`);
  console.log(`  Refund to payer: ${resolveResult.refundAmount} ETH`);
  console.log();
  
  // Example 6: Final task state
  console.log('Example 6: Final task state');
  console.log('-'.repeat(40));
  
  const finalTask = await readOnlySDK.getTask(taskId);
  console.log('Final task details:');
  console.log(`  Status: ${finalTask.status}`);
  console.log(`  Score: ${finalTask.score}/100`);
  console.log(`  Resolved: ${finalTask.resolved}`);
  console.log(`  Deliverable: ${finalTask.deliverableHash}`);
  console.log();
  
  console.log('Example completed successfully!');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = main;
