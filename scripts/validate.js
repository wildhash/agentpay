#!/usr/bin/env node

/**
 * Validation script to check AgentPay implementation
 * Validates contract structure, SDK, and file presence
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('AgentPay Implementation Validation');
console.log('='.repeat(60));
console.log();

let allPassed = true;

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✓' : '✗';
  console.log(`${status} ${description}: ${filePath}`);
  if (!exists) allPassed = false;
  return exists;
}

function checkFileContent(filePath, searchStrings, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`✗ ${description}: ${filePath} (file not found)`);
    allPassed = false;
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let allFound = true;
  
  for (const str of searchStrings) {
    if (!content.includes(str)) {
      console.log(`✗ ${description}: Missing "${str}" in ${filePath}`);
      allFound = false;
      allPassed = false;
    }
  }
  
  if (allFound) {
    console.log(`✓ ${description}: ${filePath}`);
  }
  
  return allFound;
}

console.log('1. Checking Project Structure');
console.log('-'.repeat(60));
checkFile('contracts/AgentEscrow.sol', 'Smart contract');
checkFile('sdk/AgentPaySDK.js', 'SDK implementation');
checkFile('sdk/AgentEscrow.abi.json', 'Contract ABI');
checkFile('verifier/server.js', 'AI verifier service');
checkFile('scripts/deploy.js', 'Deployment script');
checkFile('scripts/demo-scenario.js', 'Demo scenario');
checkFile('web/index.html', 'Web demo');
checkFile('README.md', 'README documentation');
checkFile('package.json', 'Package configuration');
checkFile('hardhat.config.js', 'Hardhat configuration');
checkFile('.env.example', 'Environment example');
checkFile('.gitignore', 'Git ignore file');
console.log();

console.log('2. Checking Smart Contract Features');
console.log('-'.repeat(60));
checkFileContent('contracts/AgentEscrow.sol', [
  'pragma solidity',
  'contract AgentEscrow',
  'function createTask',
  'function submitDeliverable',
  'function scoreAndResolve',
  'function cancelTask',
  'function getTask',
  'enum TaskStatus',
  'event TaskCreated',
  'event TaskSubmitted',
  'event TaskScored',
  'event TaskResolved'
], 'Smart contract implementation');
console.log();

console.log('3. Checking SDK Features');
console.log('-'.repeat(60));
checkFileContent('sdk/AgentPaySDK.js', [
  'class AgentPaySDK',
  'async createTask',
  'async submitDeliverable',
  'async scoreAndResolve',
  'async getTask',
  'async getBalance'
], 'SDK implementation');
console.log();

console.log('4. Checking AI Verifier');
console.log('-'.repeat(60));
checkFileContent('verifier/server.js', [
  'class AIVerifier',
  'scoreDeliverable',
  'verifyAndResolve',
  'express',
  '/verify/:taskId'
], 'AI verifier service');
console.log();

console.log('5. Checking Demo Scenario');
console.log('-'.repeat(60));
checkFileContent('scripts/demo-scenario.js', [
  'async function runDemo',
  'Step 1',
  'Step 2',
  'createTask',
  'submitDeliverable',
  'scoreAndResolve'
], 'Demo scenario script');
console.log();

console.log('6. Checking Web Demo');
console.log('-'.repeat(60));
checkFileContent('web/index.html', [
  '<title>AgentPay',
  'Accounts & Balances',
  'Create Task',
  'Tasks',
  'Events',
  'ethers'
], 'Web demo interface');
console.log();

console.log('7. Checking Documentation');
console.log('-'.repeat(60));
checkFileContent('README.md', [
  '# AgentPay',
  'Features',
  'Quick Start',
  'Usage',
  'Smart Contract API',
  'Deploy to Testnet',
  'Demo Scenario'
], 'README documentation');
console.log();

console.log('8. Checking Package Configuration');
console.log('-'.repeat(60));
checkFileContent('package.json', [
  '"compile"',
  '"deploy:local"',
  '"deploy:sepolia"',
  '"demo"',
  '"verifier"',
  '"web"',
  'ethers',
  'hardhat'
], 'Package.json scripts');
console.log();

console.log('9. Checking ABI Generation');
console.log('-'.repeat(60));
const abiPath = path.join(__dirname, '../sdk/AgentEscrow.abi.json');
if (fs.existsSync(abiPath)) {
  try {
    const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const functionNames = abi.filter(item => item.type === 'function').map(item => item.name);
    const eventNames = abi.filter(item => item.type === 'event').map(item => item.name);
    
    console.log(`✓ ABI valid JSON with ${abi.length} entries`);
    console.log(`  Functions: ${functionNames.join(', ')}`);
    console.log(`  Events: ${eventNames.join(', ')}`);
  } catch (e) {
    console.log('✗ ABI is not valid JSON');
    allPassed = false;
  }
} else {
  console.log('✗ ABI file not found');
  allPassed = false;
}
console.log();

console.log('='.repeat(60));
if (allPassed) {
  console.log('✓ All validation checks passed!');
  console.log();
  console.log('Next steps:');
  console.log('1. Run: npm run node (start local blockchain)');
  console.log('2. Run: npm run deploy:local (deploy contract)');
  console.log('3. Run: npm run demo (run demo scenario)');
  console.log('4. Run: npm run web (start web interface)');
} else {
  console.log('✗ Some validation checks failed');
  process.exit(1);
}
console.log('='.repeat(60));
