import React, { useState } from 'react';
import { apiService } from '../api/client';
import '../styles/debug.css';

export default function DebugConsole({ userId }) {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const addLog = (type, message) => {
    setLogs((current) => [
      ...current,
      { type, message, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  const runCheck = async (label, request) => {
    try {
      const response = await request();
      addLog('info', `${label}: ${JSON.stringify(response.data)}`);
    } catch (error) {
      addLog('error', `${label}: ${error.debugInfo?.message || error.message}`);
    }
  };

  return (
    <div className={`debug-console ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button className="debug-header" type="button" onClick={() => setIsExpanded(!isExpanded)}>
        <span>Debug Console ({logs.length})</span>
        <span>{isExpanded ? 'Close' : 'Open'}</span>
      </button>

      {isExpanded && (
        <div className="debug-content">
          <div className="debug-controls">
            <button type="button" onClick={() => runCheck('Health', apiService.getHealth)}>
              Health
            </button>
            <button type="button" onClick={() => runCheck('Guardrails', apiService.getGuardrails)}>
              Guardrails
            </button>
            <button
              type="button"
              onClick={() =>
                userId
                  ? runCheck('Memory', () => apiService.getMemory(userId))
                  : addLog('error', 'Create a guest before checking memory')
              }
            >
              Memory
            </button>
            <button type="button" onClick={() => setLogs([])}>
              Clear
            </button>
          </div>

          <div className="debug-logs">
            {logs.length === 0 ? (
              <p className="empty">No checks yet.</p>
            ) : (
              logs.map((log, index) => (
                <div className={`log-entry ${log.type}`} key={`${log.timestamp}-${index}`}>
                  <span>{log.timestamp}</span>
                  <strong>{log.type}</strong>
                  <p>{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
