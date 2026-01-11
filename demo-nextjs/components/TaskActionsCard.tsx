'use client';

import { useState } from 'react';

interface TaskActionsProps {
  onAction: (action: string, data: any) => void;
}

export default function TaskActionsCard({ onAction }: TaskActionsProps) {
  const [taskId, setTaskId] = useState('');
  const [resultText, setResultText] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const handleSubmit = async () => {
    setError('');
    setLoading('submit');

    try {
      const response = await fetch('/api/task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: parseInt(taskId), resultText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit deliverable');
      }

      onAction('submit', { taskId, txHash: data.txHash });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleVerify = async () => {
    setError('');
    setVerifyResult(null);
    setLoading('verify');

    try {
      const taskResponse = await fetch(`/api/task/${taskId}`);
      const taskData = await taskResponse.json();

      if (!taskResponse.ok) {
        throw new Error(taskData.error || 'Failed to fetch task');
      }

      const verifyResponse = await fetch('/api/task/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: taskData.description,
          resultText
        })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Failed to verify');
      }

      setVerifyResult(verifyData);
      onAction('verify', { taskId, ...verifyData });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSettle = async () => {
    if (!verifyResult) {
      setError('Please run verifier first to get a score');
      return;
    }

    setError('');
    setLoading('settle');

    try {
      const response = await fetch('/api/task/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: parseInt(taskId),
          score: verifyResult.score
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to settle task');
      }

      onAction('settle', { taskId, ...data });
      setVerifyResult(null);
      setResultText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Submit, Verify & Settle</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task ID
          </label>
          <input
            type="number"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Result / Deliverable
          </label>
          <textarea
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            placeholder="Enter the work result or deliverable..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
          />
        </div>

        {verifyResult && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <div className="font-semibold text-blue-900">
              AI Score: {verifyResult.score}/100
            </div>
            <div className="text-sm text-blue-700 mt-2">
              {verifyResult.rationale}
            </div>
            {verifyResult.fallback && (
              <div className="text-xs text-blue-600 mt-2 italic">
                (Using fallback mode)
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={loading !== null || !taskId || !resultText}
            className="w-full bg-secondary hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading === 'submit' ? 'Submitting...' : 'Submit Result'}
          </button>
          <button
            onClick={handleVerify}
            disabled={loading !== null || !taskId || !resultText}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading === 'verify' ? 'Running Verifier...' : 'Run Verifier'}
          </button>
          <button
            onClick={handleSettle}
            disabled={loading !== null || !taskId || !verifyResult}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading === 'settle' ? 'Settling...' : 'Settle Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
