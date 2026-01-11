import { ethers } from 'ethers';

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatMNEE(amount: bigint | string): string {
  try {
    const formatted = ethers.formatUnits(amount.toString(), 6);
    return parseFloat(formatted).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  } catch (e) {
    return '0.00';
  }
}

export function parseMNEE(amount: string): bigint {
  try {
    return ethers.parseUnits(amount, 6);
  } catch (e) {
    return BigInt(0);
  }
}

export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleString();
}

export function createDeliverableHash(content: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(content));
}

export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1: return 'Mainnet';
    case 11155111: return 'Sepolia';
    case 31337: return 'Localhost';
    default: return `Chain ${chainId}`;
  }
}

export function shortenTxHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
