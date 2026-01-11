import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/contracts';

export async function GET() {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';
    const mneeAddress = process.env.NEXT_PUBLIC_MNEE_ADDRESS;
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
    const privateKey = process.env.SERVER_PRIVATE_KEY;

    if (!mneeAddress || !escrowAddress || !privateKey) {
      return NextResponse.json(
        { error: 'Missing configuration. Please set environment variables.' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const mneeContract = new ethers.Contract(mneeAddress, ERC20_ABI, provider);
    const escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, provider);

    const [network, balance, mneeBalance, taskCount] = await Promise.all([
      provider.getNetwork(),
      provider.getBalance(wallet.address),
      mneeContract.balanceOf(wallet.address),
      escrowContract.taskCount()
    ]);

    return NextResponse.json({
      network: {
        chainId: Number(network.chainId),
        name: network.name
      },
      contracts: {
        mnee: mneeAddress,
        escrow: escrowAddress
      },
      signer: {
        address: wallet.address,
        ethBalance: ethers.formatEther(balance),
        mneeBalance: ethers.formatUnits(mneeBalance, 6)
      },
      taskCount: Number(taskCount)
    });
  } catch (error: any) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
