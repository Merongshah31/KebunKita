import React, { useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function SmartFarming({ userId, onError }) {
  const [cropType, setCropType] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [soilType, setSoilType] = useState('');
  const [waterSource, setWaterSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cropType || !areaSize) {
      onError('Crop type and area size are required');
      return;
    }
    if (!userId) {
      onError('User ID is required');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.createFarmingPlan(
        userId,
        cropType,
        parseFloat(areaSize),
        soilType,
        waterSource
      );
      setResult(response.data);
      setCropType('');
      setAreaSize('');
      setSoilType('');
      setWaterSource('');
    } catch (error) {
      onError(`Error: ${error.debugInfo?.message} (${error.debugInfo?.status})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-panel">
      <h2>ðŸšœ Smart Farming Plan</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Crop Type</label>
          <input
            type="text"
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            placeholder="e.g., Tomato, Rice, Corn"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Area Size (hectares)</label>
          <input
            type="number"
            step="0.1"
            value={areaSize}
            onChange={(e) => setAreaSize(e.target.value)}
            placeholder="e.g., 2.5"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Soil Type (optional)</label>
          <input
            type="text"
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            placeholder="e.g., Clay loam, Sandy"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Water Source (optional)</label>
          <input
            type="text"
            value={waterSource}
            onChange={(e) => setWaterSource(e.target.value)}
            placeholder="e.g., Rain-fed, Irrigation"
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating plan...' : 'Create Farming Plan'}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <h3>Farming Plan</h3>
          <p><strong>Plan:</strong> {result.plan}</p>
          {result.estimated_yield && (
            <p><strong>Estimated Yield:</strong> {result.estimated_yield}</p>
          )}
          {result.telegram_hint && (
            <p className="hint">ðŸ“² Telegram updates will be sent to track progress</p>
          )}
          {result.memory_ref && <p className="memory-ref">ðŸ“š Memory ID: {result.memory_ref}</p>}
        </div>
      )}
    </div>
  );
}
