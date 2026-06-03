import React, { useCallback, useEffect, useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

const plantTypeOptions = ['Chili', 'Tomato', 'Kangkung', 'Spinach', 'Herbs', 'Other'];

export default function PlantHealth({ userId, onError }) {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [plantType, setPlantType] = useState('Chili');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await apiService.getPlantHealthHistory(userId);
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setHistory([]);
      setHistoryError(error.debugInfo?.message || error.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
      const combinedNotes = [`Plant type: ${plantType}`, notes].filter(Boolean).join('\n');
      const response = await apiService.analyzePlant(userId, imageFile, combinedNotes);
      setResult(response.data);
      await fetchHistory();
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
          <h3>Plant Health</h3>
          <p className="agent-subtitle">
            Upload a plant or leaf photo to detect possible plant health issues.
          </p>
        </div>
        <span className="agent-badge">YOLOv8 + DeepSeek</span>
      </div>

      <form className="agent-form" onSubmit={handleSubmit}>
        <label className="upload-zone">
          {preview ? (
            <img src={preview} alt="Selected plant preview" />
          ) : (
            <span>Tap to upload a plant or leaf photo</span>
          )}
          <input type="file" accept="image/*" onChange={handleImageSelect} />
        </label>

        <label>
          Plant Type
          <select value={plantType} onChange={(event) => setPlantType(event.target.value)}>
            {plantTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
        <ResultCard title="Analysis Result">
          <div className={`status-row status-row-${mapStatusTone(result.status)}`}>
            <div>
              <small className="result-label">Plant Status</small>
              <strong>{mapStatusLabel(result.status)}</strong>
            </div>
            <span>{Math.round((result.confidence || 0) * 100)}% confidence</span>
          </div>

          <div className="diagnosis-grid">
            <InfoBlock label="Detected Issue" value={result.disease_name || 'No clear issue detected'} />
            <InfoBlock label="Confidence Score" value={`${Math.round((result.confidence || 0) * 100)}%`} />
          </div>

          <section className="health-explanation-card">
            <strong>AI Explanation</strong>
            <p>{result.recommendation || 'The AI could not generate a full explanation for this image.'}</p>
          </section>

          {result.symptoms?.length > 0 && <List label="Observed Signals" items={result.symptoms} />}
          <List label="Suggested Actions" items={result.treatment_plan} emptyText="No specific action suggested yet." />

          <small className="result-disclaimer">
            This is AI-assisted guidance, not a final expert diagnosis.
          </small>
        </ResultCard>
      )}

      <ResultCard title="Recent Analyses">
        {historyLoading ? (
          <p>Loading plant health history...</p>
        ) : historyError ? (
          <p>Could not load history: {historyError}</p>
        ) : history.length === 0 ? (
          <p>No diagnosis history yet. Upload a photo to create the first live record.</p>
        ) : (
          <div className="mini-list">
            {history.map((entry) => (
              <span key={entry.id}>
                {mapStatusLabel(entry.status)}{entry.disease_name ? ` - ${entry.disease_name}` : ''} ({Math.round((entry.confidence || 0) * 100)}%)
              </span>
            ))}
          </div>
        )}
      </ResultCard>
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

function List({ label, items, emptyText }) {
  if ((!items || items.length === 0) && !emptyText) return null;
  if (!items || items.length === 0) {
    return (
      <div className="mini-list">
        <strong>{label}</strong>
        <span>{emptyText}</span>
      </div>
    );
  }
  return (
    <div className="mini-list">
      <strong>{label}</strong>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="diagnosis-stat">
      <small className="result-label">{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function mapStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'healthy') return 'Healthy';
  if (normalized === 'diseased') return 'Possibly Unhealthy';
  return 'Unknown';
}

function mapStatusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'healthy') return 'healthy';
  if (normalized === 'diseased') return 'warning';
  return 'unknown';
}
