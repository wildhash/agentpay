const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying AgentEscrow contract...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Deploy contract with deployer as initial verifier
  const AgentEscrow = await hre.ethers.getContractFactory("AgentEscrow");
  const agentEscrow = await AgentEscrow.deploy(deployer.address);
  
  await agentEscrow.waitForDeployment();
  
  const contractAddress = await agentEscrow.getAddress();
  console.log("AgentEscrow deployed to:", contractAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    verifier: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const filename = `${hre.network.name}-deployment.json`;
  fs.writeFileSync(
    path.join(deploymentPath, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to:", filename);
  
  // Save ABI for SDK
  const artifactPath = path.join(__dirname, "../artifacts/contracts/AgentEscrow.sol/AgentEscrow.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  const abiPath = path.join(__dirname, "../sdk");
  fs.writeFileSync(
    path.join(abiPath, "AgentEscrow.abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
  
  console.log("ABI saved for SDK");
  
  return deploymentInfo;
}

// Run deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
