import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payee, amount, spec, deadlineMins } = body;

    if (!payee || !amount || !spec || !deadlineMins) {
      return NextResponse.json(
        { error: 'Missing required fields: payee, amount, spec, deadlineMins' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';
    const mneeAddress = process.env.NEXT_PUBLIC_MNEE_ADDRESS;
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
    const privateKey = process.env.SERVER_PRIVATE_KEY;

    if (!mneeAddress || !escrowAddress || !privateKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const mneeContract = new ethers.Contract(mneeAddress, ERC20_ABI, wallet);
    const escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, wallet);

    const amountInWei = ethers.parseUnits(amount.toString(), 6);
    const timeoutInSeconds = Number(deadlineMins) * 60;

    const allowance = await mneeContract.allowance(wallet.address, escrowAddress);
    if (allowance < amountInWei) {
      console.log('Approving MNEE spend...');
      const approveTx = await mneeContract.approve(escrowAddress, amountInWei);
      await approveTx.wait();
    }

    console.log('Creating task...');
    const tx = await escrowContract.createTask(
      payee,
      spec,
      amountInWei,
      timeoutInSeconds
    );

    const receipt = await tx.wait();

    const taskCreatedEvent = receipt.logs
      .map((log: any) => {
        try {
          return escrowContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event?.name === 'TaskCreated');

    const taskId = taskCreatedEvent?.args?.taskId?.toString() || '0';

    return NextResponse.json({
      taskId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}
