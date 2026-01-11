/**
 * AgentPay Deployment Script
 * Deploys AgentEscrowMNEE contract with MNEE token support
 */

const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

// MNEE Mainnet Address on Ethereum
const MNEE_MAINNET = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           AgentPay MNEE Deployment                       ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Network: ${network.name.padEnd(46)}║`);
  console.log(`║  Chain ID: ${network.chainId.toString().padEnd(45)}║`);
  console.log(`║  Deployer: ${deployer.address.substring(0,20)}...                  ║`);
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
  console.log();

  let mneeAddress;
  
  // Deploy Mock MNEE on local/testnet, use real MNEE on mainnet
  if (network.chainId === 1n) {
    // Mainnet - use real MNEE
    mneeAddress = MNEE_MAINNET;
    console.log(`Using mainnet MNEE: ${mneeAddress}`);
  } else {
    // Testnet/Local - deploy mock
    console.log("Deploying MockMNEE token...");
    const MockMNEE = await ethers.getContractFactory("MockMNEE");
    const mockMnee = await MockMNEE.deploy();
    await mockMnee.waitForDeployment();
    mneeAddress = await mockMnee.getAddress();
    console.log(`✓ MockMNEE deployed: ${mneeAddress}`);
    
    // Mint some tokens to deployer for testing
    const mintAmount = ethers.parseUnits("100000", 6); // 100k MNEE
    await mockMnee.mint(deployer.address, mintAmount);
    console.log(`✓ Minted ${ethers.formatUnits(mintAmount, 6)} MNEE to deployer`);
  }
  console.log();

  // Deploy AgentEscrowMNEE
  console.log("Deploying AgentEscrowMNEE...");
  const AgentEscrow = await ethers.getContractFactory("AgentEscrowMNEE");
  const escrow = await AgentEscrow.deploy(mneeAddress, deployer.address);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`✓ AgentEscrowMNEE deployed: ${escrowAddress}`);
  console.log();

  // Verify deployment
  console.log("Verifying deployment...");
  const mneeToken = await escrow.mneeToken();
  const defaultTimeout = await escrow.defaultTimeout();
  const minAmount = await escrow.minTaskAmount();
  const maxAmount = await escrow.maxTaskAmount();
  
  console.log(`  MNEE Token: ${mneeToken}`);
  console.log(`  Default Timeout: ${defaultTimeout / 86400n} days`);
  console.log(`  Min Task Amount: ${ethers.formatUnits(minAmount, 6)} MNEE`);
  console.log(`  Max Task Amount: ${ethers.formatUnits(maxAmount, 6)} MNEE`);
  console.log();

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      AgentEscrowMNEE: escrowAddress,
      MNEE: mneeAddress,
      isMockMNEE: network.chainId !== 1n
    },
    config: {
      defaultTimeout: Number(defaultTimeout),
      minTaskAmount: ethers.formatUnits(minAmount, 6),
      maxTaskAmount: ethers.formatUnits(maxAmount, 6)
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✓ Deployment info saved to: ${deploymentFile}`);

  // Copy ABI to SDK
  const artifact = await artifacts.readArtifact("AgentEscrowMNEE");
  const abiDir = path.join(__dirname, "..", "sdk");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(abiDir, "AgentEscrowMNEE.abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
  console.log(`✓ ABI saved to: sdk/AgentEscrowMNEE.abi.json`);
  console.log();

  // Summary
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                   DEPLOYMENT COMPLETE                    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Escrow:  ${escrowAddress}  ║`);
  console.log(`║  MNEE:    ${mneeAddress}  ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Next steps:                                             ║");
  console.log("║  1. Update .env with CONTRACT_ADDRESS                    ║");
  console.log("║  2. Run: npm run demo                                    ║");
  console.log("║  3. Start verifier: npm run verifier                     ║");
  console.log("║  4. Open web UI: npm run web                             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  return { escrow: escrowAddress, mnee: mneeAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
