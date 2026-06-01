import React, { useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function PlantHealth({ userId, onError }) {
  const [imageName, setImageName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      onError('Please select an image');
      return;
    }
    if (!userId) {
      onError('User ID is required');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.analyzePlant(userId, imageName, imageFile, notes);
      setResult(response.data);
      setImageFile(null);
      setImageName('');
      setNotes('');
    } catch (error) {
      onError(`Error: ${error.debugInfo?.message} (${error.debugInfo?.status})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-panel">
      <h2>🌱 Plant Health Analysis</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Upload Plant Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            disabled={loading}
          />
          {imageName && <p className="file-name">Selected: {imageName}</p>}
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Wilting leaves, brown spots..."
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Plant'}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <h3>Analysis Result</h3>
          <p><strong>Status:</strong> {result.status}</p>
          {result.disease_name && <p><strong>Disease:</strong> {result.disease_name}</p>}
          {result.confidence && <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%</p>}
          {result.symptoms && <p><strong>Symptoms:</strong> {result.symptoms}</p>}
          {result.treatment_plan && <p><strong>Treatment:</strong> {result.treatment_plan}</p>}
          {result.memory_ref && <p className="memory-ref">📚 Memory ID: {result.memory_ref}</p>}
        </div>
      )}
    </div>
  );
}
