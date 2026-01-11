import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ESCROW_ABI } from '@/lib/contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, resultText } = body;

    if (taskId === undefined || !resultText) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, resultText' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
    const privateKey = process.env.SERVER_PRIVATE_KEY;

    if (!escrowAddress || !privateKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, wallet);

    const resultHash = ethers.keccak256(ethers.toUtf8Bytes(resultText));

    console.log(`Submitting deliverable for task ${taskId}...`);
    const tx = await escrowContract.submitDeliverable(taskId, resultHash);
    const receipt = await tx.wait();

    return NextResponse.json({
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      resultHash
    });
  } catch (error: any) {
    console.error('Submit task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit deliverable' },
      { status: 500 }
    );
  }
}
