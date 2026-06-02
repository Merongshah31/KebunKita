import React, { useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

const listings = [
  {
    title: 'Fresh Red Chillies',
    owner: 'Abu Bakar',
    distance: '0.8km',
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=700&q=80',
  },
  {
    title: 'Baby Carrots',
    owner: 'Siti Aminah',
    distance: '2.4km',
    image: 'https://images.unsplash.com/photo-1447175008436-1701707eb8a3?auto=format&fit=crop&w=700&q=80',
  },
];

export default function CommunityExchange({ userId, onError }) {
  const [title, setTitle] = useState('2kg Kangkung');
  const [quantity, setQuantity] = useState('2kg');
  const [location, setLocation] = useState('Tanjung Malim');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiService.matchHarvest(userId, title, quantity, location);
      setResult(response.data);
    } catch (error) {
      onError(`Exchange failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="agent-panel">
      <div className="agent-title">
        <div>
          <span className="agent-kicker">Community exchange</span>
          <h3>Post a harvest for barter</h3>
        </div>
        <span className="agent-badge">Local matches</span>
      </div>

      <div className="market-strip">
        {listings.map((listing) => (
          <article key={listing.title}>
            <img src={listing.image} alt={listing.title} />
            <strong>{listing.title}</strong>
            <span>{listing.owner} - {listing.distance}</span>
          </article>
        ))}
      </div>

      <form className="agent-form two-column" onSubmit={handleSubmit}>
        <label>
          Listing title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Quantity
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </label>
        <label>
          Area
          <input value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? 'Finding matches...' : 'Find barter matches'}
        </button>
      </form>

      {result && (
        <div className="result-card">
          <h4>Suggested matches</h4>
          <p>Post ID: {result.post_id}</p>
          <div className="match-list">
            {result.matches.map((match) => (
              <div className="match-item" key={match.match_user}>
                <strong>{match.match_user}</strong>
                <span>{Math.round(match.score * 100)} percent fit</span>
                <p>{match.reason}</p>
              </div>
            ))}
          </div>
          <small>{result.memory_ref}</small>
        </div>
      )}
    </article>
  );
}
