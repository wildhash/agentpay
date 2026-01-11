'use client';

import { formatAddress } from '@/lib/utils';

interface StatusData {
  network: {
    chainId: number;
    name: string;
  };
  contracts: {
    mnee: string;
    escrow: string;
  };
  signer: {
    address: string;
    ethBalance: string;
    mneeBalance: string;
  };
  taskCount: number;
}

export default function StatusCard({ status }: { status: StatusData | null }) {
  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">System Status</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">System Status</h2>
      <div className="space-y-3">
        <div>
          <span className="text-sm text-gray-600">Network:</span>
          <span className="ml-2 font-mono text-sm">
            {status.network.name} (Chain ID: {status.network.chainId})
          </span>
        </div>
        <div>
          <span className="text-sm text-gray-600">MNEE Token:</span>
          <span className="ml-2 font-mono text-xs">
            {formatAddress(status.contracts.mnee)}
          </span>
        </div>
        <div>
          <span className="text-sm text-gray-600">Escrow Contract:</span>
          <span className="ml-2 font-mono text-xs">
            {formatAddress(status.contracts.escrow)}
          </span>
        </div>
        <div className="pt-2 border-t">
          <span className="text-sm text-gray-600">Server Signer:</span>
          <span className="ml-2 font-mono text-xs">
            {formatAddress(status.signer.address)}
          </span>
        </div>
        <div>
          <span className="text-sm text-gray-600">MNEE Balance:</span>
          <span className="ml-2 font-semibold text-green-600">
            {parseFloat(status.signer.mneeBalance).toLocaleString()} MNEE
          </span>
        </div>
        <div>
          <span className="text-sm text-gray-600">Total Tasks:</span>
          <span className="ml-2 font-semibold">{status.taskCount}</span>
        </div>
      </div>
    </div>
  );
}
