import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ESCROW_ABI } from '@/lib/contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, score } = body;

    if (taskId === undefined || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, score' },
        { status: 400 }
      );
    }

    if (score < 0 || score > 100) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 100' },
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

    console.log(`Settling task ${taskId} with score ${score}...`);
    const tx = await escrowContract.scoreAndResolve(taskId, score);
    const receipt = await tx.wait();

    const taskResolvedEvent = receipt.logs
      .map((log: any) => {
        try {
          return escrowContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event?.name === 'TaskResolved');

    const payeeAmount = taskResolvedEvent?.args?.payeeAmount || BigInt(0);
    const refundAmount = taskResolvedEvent?.args?.refundAmount || BigInt(0);

    return NextResponse.json({
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      payeeAmount: ethers.formatUnits(payeeAmount, 6),
      refundAmount: ethers.formatUnits(refundAmount, 6),
      score
    });
  } catch (error: any) {
    console.error('Settle task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to settle task' },
      { status: 500 }
    );
  }
}
