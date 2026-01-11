#!/usr/bin/env node
/**
 * Offline contract compilation script
 * Uses locally installed solc-js to compile contracts
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');

// Read contract files
const contractsDir = path.join(__dirname, 'contracts');
const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));

console.log('📦 Compiling contracts offline...\n');

// Read OpenZeppelin imports
const nodeModulesPath = path.join(__dirname, 'node_modules');

function findImports(importPath) {
  try {
    let fullPath;
    if (importPath.startsWith('@openzeppelin')) {
      fullPath = path.join(nodeModulesPath, importPath);
    } else {
      fullPath = path.join(contractsDir, importPath);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    return { contents: content };
  } catch (error) {
    return { error: 'File not found: ' + importPath };
  }
}

// Prepare input for solc
const sources = {};
files.forEach(file => {
  const filePath = path.join(contractsDir, file);
  sources[file] = {
    content: fs.readFileSync(filePath, 'utf8')
  };
});

const input = {
  language: 'Solidity',
  sources: sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata']
      }
    }
  }
};

console.log('🔨 Compiling with solc-js...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

// Check for errors
if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error('❌ Compilation errors:');
    errors.forEach(err => console.error(err.formattedMessage));
    process.exit(1);
  }
  // Show warnings
  output.errors.filter(e => e.severity === 'warning').forEach(warning => {
    console.warn('⚠️', warning.formattedMessage);
  });
}

// Create artifacts directory
const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');
fs.mkdirSync(artifactsDir, { recursive: true });

// Write artifacts
Object.keys(output.contracts).forEach(fileName => {
  const contracts = output.contracts[fileName];
  Object.keys(contracts).forEach(contractName => {
    const contract = contracts[contractName];

    const artifact = {
      _format: 'hh-sol-artifact-1',
      contractName: contractName,
      sourceName: `contracts/${fileName}`,
      abi: contract.abi,
      bytecode: '0x' + contract.evm.bytecode.object,
      deployedBytecode: '0x' + contract.evm.deployedBytecode.object,
      linkReferences: contract.evm.bytecode.linkReferences || {},
      deployedLinkReferences: contract.evm.deployedBytecode.linkReferences || {}
    };

    const contractDir = path.join(artifactsDir, fileName);
    fs.mkdirSync(contractDir, { recursive: true });

    const artifactPath = path.join(contractDir, `${contractName}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

    // Also write debug file
    const dbgPath = path.join(contractDir, `${contractName}.dbg.json`);
    fs.writeFileSync(dbgPath, JSON.stringify({ _format: 'hh-sol-dbg-1', buildInfo: null }, null, 2));

    console.log(`✅ ${contractName}`);
  });
});

console.log('\n✨ Compilation complete!');
console.log(`📂 Artifacts saved to: ${artifactsDir}\n`);
