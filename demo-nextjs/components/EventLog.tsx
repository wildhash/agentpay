'use client';

import { shortenTxHash } from '@/lib/utils';

export interface LogEvent {
  type: 'TaskCreated' | 'TaskSubmitted' | 'Verified' | 'TaskResolved';
  timestamp: Date;
  data: any;
}

export default function EventLog({ events }: { events: LogEvent[] }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'TaskCreated':
        return '🎯';
      case 'TaskSubmitted':
        return '📤';
      case 'Verified':
        return '🤖';
      case 'TaskResolved':
        return '✅';
      default:
        return '📋';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'TaskCreated':
        return 'border-l-purple-500 bg-purple-50';
      case 'TaskSubmitted':
        return 'border-l-cyan-500 bg-cyan-50';
      case 'Verified':
        return 'border-l-blue-500 bg-blue-50';
      case 'TaskResolved':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Event Log</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No events yet. Create a task to get started!</p>
        ) : (
          events.map((event, index) => (
            <div
              key={index}
              className={`border-l-4 p-3 rounded ${getEventColor(event.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <span className="text-xl">{getEventIcon(event.type)}</span>
                  <div>
                    <div className="font-semibold text-gray-800">{event.type}</div>
                    <div className="text-xs text-gray-600">
                      {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm space-y-1">
                {event.data.taskId && (
                  <div className="text-gray-700">
                    <span className="font-medium">Task ID:</span> {event.data.taskId}
                  </div>
                )}
                {event.data.txHash && (
                  <div className="text-gray-700">
                    <span className="font-medium">Tx:</span>{' '}
                    <span className="font-mono text-xs">
                      {shortenTxHash(event.data.txHash)}
                    </span>
                  </div>
                )}
                {event.data.score !== undefined && (
                  <div className="text-gray-700">
                    <span className="font-medium">Score:</span> {event.data.score}/100
                  </div>
                )}
                {event.data.payeeAmount && (
                  <div className="text-green-700">
                    <span className="font-medium">Payout:</span> {event.data.payeeAmount} MNEE
                  </div>
                )}
                {event.data.refundAmount && (
                  <div className="text-blue-700">
                    <span className="font-medium">Refund:</span> {event.data.refundAmount} MNEE
                  </div>
                )}
                {event.data.rationale && (
                  <div className="text-gray-600 italic text-xs mt-1">
                    {event.data.rationale}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
