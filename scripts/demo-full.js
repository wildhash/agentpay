#!/usr/bin/env node
/**
 * AgentPay Full Demo Runner
 * 
 * One-command demo that:
 * 1. Checks if local node is running
 * 2. Deploys contracts if needed
 * 3. Runs the complete demo scenario
 * 
 * Usage: npm run demo:full
 */

const { spawn } = require('child_process');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkNodeRunning() {
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    await provider.getNetwork();
    return true;
  } catch (error) {
    return false;
  }
}

async function checkDeployment() {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const deploymentFile = path.join(deploymentsDir, 'localhost-deployment.json');
  return fs.existsSync(deploymentFile);
}

function runCommand(command, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ...env }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'bright');
  log('║        AgentPay Full Demo - One Command Setup           ║', 'bright');
  log('║     AI-Native Payments with MNEE Stablecoin             ║', 'bright');
  log('╚══════════════════════════════════════════════════════════╝\n', 'bright');

  try {
    // Step 1: Check if node is running
    log('📡 Step 1: Checking local blockchain...', 'cyan');
    const isNodeRunning = await checkNodeRunning();
    
    if (!isNodeRunning) {
      log('❌ Local blockchain not running!', 'red');
      log('\nPlease start the local node in a separate terminal:', 'yellow');
      log('   npm run node', 'yellow');
      log('\nFor mainnet fork (uses real MNEE contract):', 'yellow');
      log('   npm run node:fork\n', 'yellow');
      process.exit(1);
    }
    
    log('✅ Local blockchain is running\n', 'green');

    // Step 2: Check deployment
    log('📋 Step 2: Checking contract deployment...', 'cyan');
    const isDeployed = await checkDeployment();
    
    if (!isDeployed) {
      log('⚙️  Deploying contracts...', 'yellow');
      await runCommand('npm', ['run', 'deploy:local']);
      log('✅ Contracts deployed successfully\n', 'green');
    } else {
      log('✅ Contracts already deployed\n', 'green');
    }

    // Step 3: Run demo scenario
    log('🚀 Step 3: Running demo scenario...', 'cyan');
    log('This will demonstrate:', 'yellow');
    log('  - Agent A creates task with MNEE deposit', 'yellow');
    log('  - Agent B submits deliverable', 'yellow');
    log('  - AI verifier scores the work', 'yellow');
    log('  - Smart contract auto-settles with partial refund\n', 'yellow');
    
    await sleep(2000); // Give user time to read
    
    await runCommand('npm', ['run', 'demo']);
    
    log('\n✅ Demo completed successfully! 🎉\n', 'green');
    
    // Step 4: Next steps
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('📚 Next Steps:', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
    
    log('1️⃣  Start the web UI:', 'yellow');
    log('   npm run web', 'cyan');
    log('   Then open: http://localhost:8080\n', 'cyan');
    
    log('2️⃣  Start the AI verifier service (optional):', 'yellow');
    log('   npm run verifier        # With AI keys', 'cyan');
    log('   npm run verifier:mock   # Without AI keys\n', 'cyan');
    
    log('3️⃣  Run another demo:', 'yellow');
    log('   npm run demo\n', 'cyan');
    
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

main();
