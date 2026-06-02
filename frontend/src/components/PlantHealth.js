import React, { useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function PlantHealth({ userId, onError }) {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [notes, setNotes] = useState('Brown spots on chili leaves');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    setImageFile(file || null);
    setPreview(file ? URL.createObjectURL(file) : '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!imageFile) {
      onError('Please choose a plant image first.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.analyzePlant(userId, imageFile, notes);
      setResult(response.data);
    } catch (error) {
      onError(`Plant analysis failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="agent-panel">
      <div className="agent-title">
        <div>
          <span className="agent-kicker">AI plant health</span>
          <h3>Upload a leaf photo</h3>
        </div>
        <span className="agent-badge">YOLOv8 + DeepSeek</span>
      </div>

      <form className="agent-form" onSubmit={handleSubmit}>
        <label className="upload-zone">
          {preview ? (
            <img src={preview} alt="Selected plant preview" />
          ) : (
            <span>Tap to choose a plant image</span>
          )}
          <input type="file" accept="image/*" onChange={handleImageSelect} />
        </label>

        <label>
          Field notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Describe symptoms, watering pattern, or location."
          />
        </label>

        <button className="primary-button" disabled={loading} type="submit">
          {loading ? 'Analyzing plant...' : 'Analyze plant'}
        </button>
      </form>

      {result && (
        <ResultCard title="Diagnosis">
          <div className="status-row">
            <strong>{result.status}</strong>
            <span>{Math.round((result.confidence || 0) * 100)} percent confidence</span>
          </div>
          {result.disease_name && <p>{result.disease_name}</p>}
          <List label="Symptoms" items={result.symptoms} />
          <List label="Treatment" items={result.treatment_plan} />
          <p>{result.recommendation}</p>
          <small>{result.memory_ref}</small>
        </ResultCard>
      )}
    </article>
  );
}

function ResultCard({ title, children }) {
  return (
    <div className="result-card">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function List({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mini-list">
      <strong>{label}</strong>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
