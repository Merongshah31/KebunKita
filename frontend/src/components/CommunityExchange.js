import React, { useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function CommunityExchange({ userId, onError }) {
  const [cropName, setCropName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cropName || !quantity) {
      onError('Crop name and quantity are required');
      return;
    }
    if (!userId) {
      onError('User ID is required');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.matchHarvest(
        userId,
        cropName,
        quantity,
        location
      );
      setResult(response.data);
      setCropName('');
      setQuantity('');
      setLocation('');
    } catch (error) {
      onError(`Error: ${error.debugInfo?.message} (${error.debugInfo?.status})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-panel">
      <h2>ðŸ¤ Community Harvest Exchange</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Crop Name</label>
          <input
            type="text"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            placeholder="e.g., Tomato, Cucumber, Lettuce"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Quantity</label>
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 50kg, 100 bundles"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Location (optional)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Selangor, Kuala Lumpur"
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Matching...' : 'Find Matching Harvest'}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <h3>Matching Results</h3>
          <p><strong>Match Status:</strong> {result.match_status}</p>
          {result.matched_farms && (
            <p><strong>Matched Farms:</strong> {result.matched_farms}</p>
          )}
          {result.contact_info && (
            <p><strong>Contact:</strong> {result.contact_info}</p>
          )}
          {result.memory_ref && <p className="memory-ref">ðŸ“š Memory ID: {result.memory_ref}</p>}
        </div>
      )}
    </div>
  );
}
