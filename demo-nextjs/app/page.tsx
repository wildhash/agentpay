'use client';

import { useEffect, useState } from 'react';
import StatusCard from '@/components/StatusCard';
import CreateTaskCard from '@/components/CreateTaskCard';
import TaskActionsCard from '@/components/TaskActionsCard';
import EventLog, { LogEvent } from '@/components/EventLog';

export default function Home() {
  const [status, setStatus] = useState<any>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      if (response.ok) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (taskId: string, txHash: string) => {
    setEvents([
      {
        type: 'TaskCreated',
        timestamp: new Date(),
        data: { taskId, txHash }
      },
      ...events
    ]);
    fetchStatus();
  };

  const handleAction = (action: string, data: any) => {
    let eventType: LogEvent['type'] = 'TaskCreated';

    switch (action) {
      case 'submit':
        eventType = 'TaskSubmitted';
        break;
      case 'verify':
        eventType = 'Verified';
        break;
      case 'settle':
        eventType = 'TaskResolved';
        break;
    }

    setEvents([
      {
        type: eventType,
        timestamp: new Date(),
        data
      },
      ...events
    ]);

    if (action === 'settle') {
      fetchStatus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-cyan-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading AgentPay Demo...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-cyan-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AgentPay Demo
          </h1>
          <p className="text-lg text-gray-600">
            Programmable Escrow for AI Agents with MNEE Stablecoin
          </p>
        </div>

        {!status || status.error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h3 className="font-bold mb-2">Configuration Error</h3>
            <p className="mb-2">
              {status?.error || 'Failed to connect to blockchain. Please check:'}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Hardhat node is running (npm run node)</li>
              <li>Contracts are deployed</li>
              <li>Environment variables are set (.env.local)</li>
              <li>NEXT_PUBLIC_ESCROW_ADDRESS is configured</li>
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <StatusCard status={status} />
              <CreateTaskCard onTaskCreated={handleTaskCreated} />
            </div>

            <div className="space-y-6">
              <TaskActionsCard onAction={handleAction} />
              <EventLog events={events} />
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Powered by MNEE Stablecoin • AI-Verified Escrow • On-Chain Settlement
          </p>
        </div>
      </div>
    </main>
  );
}
