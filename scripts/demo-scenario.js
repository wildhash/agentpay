/**
 * AgentPay Demo Scenario
 * 
 * Demonstrates the complete flow:
 * 1. Agent A creates a task with MNEE deposit
 * 2. Agent B submits deliverable
 * 3. AI Verifier scores the output
 * 4. Contract auto-settles with partial/full payment
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Demo configuration
const DEMO_TASK_AMOUNT = "100"; // 100 MNEE
const DEMO_TASK_DESCRIPTION = `
Create a Python function that:
1. Takes a list of numbers as input
2. Returns the sum of all even numbers
3. Includes proper error handling
4. Has docstring documentation
`;

const DEMO_DELIVERABLE = `
def sum_even_numbers(numbers):
    """
    Calculate the sum of all even numbers in a list.
    
    Args:
        numbers: A list of integers
        
    Returns:
        int: Sum of all even numbers in the list
        
    Raises:
        TypeError: If input is not a list or contains non-integers
        
    Example:
        >>> sum_even_numbers([1, 2, 3, 4, 5, 6])
        12
    """
    if not isinstance(numbers, list):
        raise TypeError("Input must be a list")
    
    total = 0
    for num in numbers:
        if not isinstance(num, (int, float)):
            raise TypeError(f"Invalid element: {num}")
        if num % 2 == 0:
            total += num
    
    return total

# Test
if __name__ == "__main__":
    test_data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    result = sum_even_numbers(test_data)
    print(f"Sum of even numbers: {result}")  # Output: 30
`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║           AgentPay Demo Scenario                         ║");
  console.log("║    AI-Native Payments with MNEE Stablecoin               ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Load deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  let deploymentFile = path.join(deploymentsDir, "localhost-deployment.json");
  
  if (!fs.existsSync(deploymentFile)) {
    deploymentFile = path.join(deploymentsDir, "hardhat-deployment.json");
  }
  
  if (!fs.existsSync(deploymentFile)) {
    console.log("❌ No deployment found. Run: npm run deploy:local first");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log(`📋 Loading deployment from: ${deploymentFile}`);
  console.log(`   Escrow: ${deployment.contracts.AgentEscrowMNEE}`);
  console.log(`   MNEE: ${deployment.contracts.MNEE}\n`);

  // Get signers
  const [owner, payer, payee, verifier] = await ethers.getSigners();
  
  console.log("👥 Actors:");
  console.log(`   Owner/Admin: ${owner.address}`);
  console.log(`   Payer (Agent A): ${payer.address}`);
  console.log(`   Payee (Agent B): ${payee.address}`);
  console.log(`   Verifier: ${verifier.address}\n`);

  // Connect to contracts
  const escrowABI = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "sdk", "AgentEscrowMNEE.abi.json"), "utf8")
  );
  const mneeABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address, uint256) returns (bool)",
    "function approve(address, uint256) returns (bool)",
    "function mint(address, uint256)",
    "function decimals() view returns (uint8)"
  ];

  const escrow = new ethers.Contract(deployment.contracts.AgentEscrowMNEE, escrowABI, owner);
  const mnee = new ethers.Contract(deployment.contracts.MNEE, mneeABI, owner);

  // ============ SETUP ============
  console.log("═══════════════════════════════════════════════════════════");
  console.log("SETUP: Distributing MNEE tokens");
  console.log("═══════════════════════════════════════════════════════════\n");

  const decimals = await mnee.decimals();
  const amount = ethers.parseUnits("1000", decimals);
  
  // Mint MNEE to payer
  await mnee.mint(payer.address, amount);
  console.log(`✓ Minted 1000 MNEE to Payer`);

  // Payer approves escrow
  await mnee.connect(payer).approve(await escrow.getAddress(), ethers.MaxUint256);
  console.log(`✓ Payer approved escrow contract`);

  // Add verifier role
  await escrow.addVerifier(verifier.address);
  console.log(`✓ Added verifier role`);

  // Show balances
  const payerBalance = await mnee.balanceOf(payer.address);
  const payeeBalance = await mnee.balanceOf(payee.address);
  console.log(`\n📊 Initial Balances:`);
  console.log(`   Payer: ${ethers.formatUnits(payerBalance, decimals)} MNEE`);
  console.log(`   Payee: ${ethers.formatUnits(payeeBalance, decimals)} MNEE\n`);

  await sleep(1000);

  // ============ STEP 1: CREATE TASK ============
  console.log("═══════════════════════════════════════════════════════════");
  console.log("STEP 1: Agent A creates task with MNEE deposit");
  console.log("═══════════════════════════════════════════════════════════\n");

  const taskAmount = ethers.parseUnits(DEMO_TASK_AMOUNT, decimals);
  
  console.log(`📝 Task Description:`);
  console.log(`   ${DEMO_TASK_DESCRIPTION.trim().split('\n').join('\n   ')}\n`);
  console.log(`💰 Amount: ${DEMO_TASK_AMOUNT} MNEE`);
  console.log(`⏱️  Timeout: 7 days\n`);

  const createTx = await escrow.connect(payer).createTask(
    payee.address,
    DEMO_TASK_DESCRIPTION.trim(),
    taskAmount,
    0 // default timeout
  );
  const createReceipt = await createTx.wait();
  
  // Get task ID from event
  const taskCreatedEvent = createReceipt.logs.find(
    log => log.fragment?.name === "TaskCreated"
  );
  const taskId = taskCreatedEvent ? taskCreatedEvent.args[0] : 0n;

  console.log(`✅ Task Created!`);
  console.log(`   Task ID: ${taskId}`);
  console.log(`   TX Hash: ${createTx.hash}`);
  console.log(`   Gas Used: ${createReceipt.gasUsed}\n`);

  // Show updated balances
  const payerBalanceAfterCreate = await mnee.balanceOf(payer.address);
  const escrowBalance = await mnee.balanceOf(await escrow.getAddress());
  console.log(`📊 Balances After Creation:`);
  console.log(`   Payer: ${ethers.formatUnits(payerBalanceAfterCreate, decimals)} MNEE (deposited ${DEMO_TASK_AMOUNT})`);
  console.log(`   Escrow: ${ethers.formatUnits(escrowBalance, decimals)} MNEE (locked)\n`);

  await sleep(1500);

  // ============ STEP 2: SUBMIT DELIVERABLE ============
  console.log("═══════════════════════════════════════════════════════════");
  console.log("STEP 2: Agent B submits deliverable");
  console.log("═══════════════════════════════════════════════════════════\n");

  // In production, this would be an IPFS hash
  const deliverableHash = "ipfs://QmDemo" + Date.now();
  
  console.log(`📦 Deliverable Content:`);
  console.log(`   ${DEMO_DELIVERABLE.trim().split('\n').slice(0, 10).join('\n   ')}...`);
  console.log(`\n   Hash: ${deliverableHash}\n`);

  const submitTx = await escrow.connect(payee).submitDeliverable(taskId, deliverableHash);
  const submitReceipt = await submitTx.wait();

  console.log(`✅ Deliverable Submitted!`);
  console.log(`   TX Hash: ${submitTx.hash}`);
  console.log(`   Gas Used: ${submitReceipt.gasUsed}\n`);

  // Show task status
  console.log(`📋 Task Status: Submitted (awaiting verification)\n`);

  await sleep(1500);

  // ============ STEP 3: AI VERIFICATION ============
  console.log("═══════════════════════════════════════════════════════════");
  console.log("STEP 3: AI Verifier scores the deliverable");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Simulated AI scoring (in production, call the verifier service)
  console.log(`🤖 AI Analysis in progress...`);
  await sleep(2000);

  // Simulate score based on deliverable quality
  const aiScore = 85; // Good quality - meets most requirements
  
  console.log(`\n📊 AI Scoring Results:`);
  console.log(`   ┌─────────────────────────────────────┐`);
  console.log(`   │  Overall Score:  ${aiScore}/100              │`);
  console.log(`   ├─────────────────────────────────────┤`);
  console.log(`   │  Completeness:   26/30 (✓ all req) │`);
  console.log(`   │  Quality:        27/30 (✓ clean)   │`);
  console.log(`   │  Accuracy:       20/25 (✓ works)   │`);
  console.log(`   │  Relevance:      12/15 (✓ on task) │`);
  console.log(`   └─────────────────────────────────────┘`);
  console.log(`\n   Reasoning: "Code meets requirements with proper`);
  console.log(`   error handling and documentation. Minor room for`);
  console.log(`   improvement in edge case handling."\n`);

  await sleep(1000);

  // ============ STEP 4: RESOLVE & SETTLE ============
  console.log("═══════════════════════════════════════════════════════════");
  console.log("STEP 4: Contract auto-settles based on score");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Calculate expected splits
  const expectedPayeeAmount = (taskAmount * BigInt(aiScore)) / 100n;
  const expectedRefund = taskAmount - expectedPayeeAmount;

  console.log(`💰 Payment Calculation:`);
  console.log(`   Score: ${aiScore}%`);
  console.log(`   Total: ${ethers.formatUnits(taskAmount, decimals)} MNEE`);
  console.log(`   → Payee receives: ${ethers.formatUnits(expectedPayeeAmount, decimals)} MNEE (${aiScore}%)`);
  console.log(`   → Payer refund: ${ethers.formatUnits(expectedRefund, decimals)} MNEE (${100 - aiScore}%)\n`);

  const resolveTx = await escrow.connect(verifier).scoreAndResolve(taskId, aiScore);
  const resolveReceipt = await resolveTx.wait();

  console.log(`✅ Task Resolved!`);
  console.log(`   TX Hash: ${resolveTx.hash}`);
  console.log(`   Gas Used: ${resolveReceipt.gasUsed}\n`);

  await sleep(500);

  // ============ FINAL STATE ============
  console.log("═══════════════════════════════════════════════════════════");
  console.log("FINAL STATE");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Get final balances
  const payerFinalBalance = await mnee.balanceOf(payer.address);
  const payeeFinalBalance = await mnee.balanceOf(payee.address);
  const escrowFinalBalance = await mnee.balanceOf(await escrow.getAddress());

  // Get final task state
  const finalTask = await escrow.getTask(taskId);

  console.log(`📋 Task #${taskId} Final State:`);
  console.log(`   Status: Resolved ✓`);
  console.log(`   Score: ${finalTask.score}/100`);
  console.log(`   Payee Amount: ${ethers.formatUnits(finalTask.payeeAmount, decimals)} MNEE`);
  console.log(`   Refund Amount: ${ethers.formatUnits(finalTask.refundAmount, decimals)} MNEE\n`);

  console.log(`📊 Final Balances:`);
  console.log(`   Payer: ${ethers.formatUnits(payerFinalBalance, decimals)} MNEE`);
  console.log(`   Payee: ${ethers.formatUnits(payeeFinalBalance, decimals)} MNEE`);
  console.log(`   Escrow: ${ethers.formatUnits(escrowFinalBalance, decimals)} MNEE\n`);

  // Get agent stats
  const payeeStats = await escrow.getAgentStats(payee.address);
  console.log(`🏆 Payee Reputation:`);
  console.log(`   Tasks Completed: ${payeeStats[1]}`);
  console.log(`   Successful (70+): ${payeeStats[2]}`);
  console.log(`   Total Earned: ${ethers.formatUnits(payeeStats[3], decimals)} MNEE\n`);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("                    DEMO COMPLETE! 🎉                      ");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log(`Summary:`);
  console.log(`• Agent A deposited ${DEMO_TASK_AMOUNT} MNEE into escrow`);
  console.log(`• Agent B submitted Python code as deliverable`);
  console.log(`• AI scored the work at ${aiScore}/100`);
  console.log(`• Agent B received ${ethers.formatUnits(expectedPayeeAmount, decimals)} MNEE`);
  console.log(`• Agent A got ${ethers.formatUnits(expectedRefund, decimals)} MNEE refund`);
  console.log(`\nThis is trustless, automated, AI-native payments! 🤖💰\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
