import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ESCROW_ABI, TASK_STATUS_NAMES } from '@/lib/contracts';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;

    if (!escrowAddress) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, provider);

    const task = await escrowContract.getTask(taskId);

    return NextResponse.json({
      taskId,
      payer: task[0],
      payee: task[1],
      amount: ethers.formatUnits(task[2], 6),
      description: task[3],
      deliverableHash: task[4],
      score: Number(task[5]),
      status: TASK_STATUS_NAMES[Number(task[6])],
      createdAt: Number(task[7]),
      submittedAt: Number(task[8]),
      timeout: Number(task[9]),
      payeeAmount: ethers.formatUnits(task[10], 6),
      refundAmount: ethers.formatUnits(task[11], 6)
    });
  } catch (error: any) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}
