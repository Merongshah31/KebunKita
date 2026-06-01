import React, { useState } from 'react';
import { apiService } from '../api/client';
import '../styles/debug.css';

export default function DebugConsole({ userId }) {
  const [debugLogs, setDebugLogs] = useState([]);
  const [guardrailInfo, setGuardrailInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Intercept console.log to capture API logs
  React.useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      if (typeof args[0] === 'string' && (args[0].startsWith('[API') || args[0].includes('Error'))) {
        setDebugLogs((prev) => [
          ...prev,
          { timestamp: new Date().toISOString(), type: 'log', message: JSON.stringify(args) }
        ]);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      setDebugLogs((prev) => [
        ...prev,
        { timestamp: new Date().toISOString(), type: 'error', message: JSON.stringify(args) }
      ]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const handleCheckGuardrails = async () => {
    try {
      const response = await apiService.getGuardrails();
      setGuardrailInfo(response.data);
      setDebugLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'info',
          message: 'Guardrails check successful',
        }
      ]);
    } catch (error) {
      setDebugLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `Guardrails check failed: ${error.debugInfo?.message}`,
        }
      ]);
    }
  };

  const handleCheckHealth = async () => {
    try {
      const response = await apiService.getHealth();
      setDebugLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `Health check OK: ${JSON.stringify(response.data)}`,
        }
      ]);
    } catch (error) {
      setDebugLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `Health check failed: ${error.debugInfo?.message}`,
        }
      ]);
    }
  };

  const handleCheckMemory = async () => {
    if (!userId) {
      setDebugLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'User ID is required to check memory',
        }
      ]);
      return;
    }
    try {
      const response = await apiService.getMemory(userId);
      setDebugLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `Memory fetch OK: ${JSON.stringify(response.data)}`,
        }
      ]);
    } catch (error) {
      setDebugLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `Memory fetch failed: ${error.debugInfo?.message}`,
        }
      ]);
    }
  };

  const handleClearLogs = () => {
    setDebugLogs([]);
    setGuardrailInfo(null);
  };

  return (
    <div className={`debug-console ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="debug-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="debug-title">🐛 Debug Console ({debugLogs.length})</span>
        <span className="toggle-btn">{isExpanded ? '▼' : '▲'}</span>
      </div>

      {isExpanded && (
        <div className="debug-content">
          <div className="debug-controls">
            <button onClick={handleCheckHealth}>Check Health</button>
            <button onClick={handleCheckGuardrails}>Check Guardrails</button>
            <button onClick={handleCheckMemory}>Check Memory</button>
            <button onClick={handleClearLogs}>Clear Logs</button>
          </div>

          {guardrailInfo && (
            <div className="guardrail-info">
              <h4>Guardrail Status</h4>
              <pre>{JSON.stringify(guardrailInfo, null, 2)}</pre>
            </div>
          )}

          <div className="debug-logs">
            <h4>API & Error Logs</h4>
            <div className="log-list">
              {debugLogs.length === 0 ? (
                <p className="empty">No logs yet. Make a request to see API activity.</p>
              ) : (
                debugLogs.map((log, idx) => (
                  <div key={idx} className={`log-entry ${log.type}`}>
                    <span className="log-time">{log.timestamp.split('T')[1].split('.')[0]}</span>
                    <span className="log-type">[{log.type.toUpperCase()}]</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
