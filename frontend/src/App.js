import React, { useState } from 'react';
import PlantHealth from './components/PlantHealth';
import SmartFarming from './components/SmartFarming';
import CommunityExchange from './components/CommunityExchange';
import DecisionSupport from './components/DecisionSupport';
import DebugConsole from './components/DebugConsole';
import './App.css';

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('kebunkita_userId') || '');
  const [activeTab, setActiveTab] = useState('plant-health');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const handleSetUserId = (e) => {
    const id = e.target.value;
    setUserId(id);
    localStorage.setItem('kebunkita_userId', id);
  };

  const handleError = (message) => {
    setError(message);
    setShowError(true);
    setTimeout(() => setShowError(false), 5000);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌾 KebunKita — Smart Farming Assistant</h1>
        <div className="header-controls">
          <input
            type="text"
            value={userId}
            onChange={handleSetUserId}
            placeholder="Enter User ID"
            className="user-id-input"
          />
        </div>
      </header>

      {showError && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setShowError(false)}>✕</button>
        </div>
      )}

      <nav className="agent-nav">
        <button
          className={`nav-btn ${activeTab === 'plant-health' ? 'active' : ''}`}
          onClick={() => setActiveTab('plant-health')}
        >
          🌱 Plant Health
        </button>
        <button
          className={`nav-btn ${activeTab === 'smart-farming' ? 'active' : ''}`}
          onClick={() => setActiveTab('smart-farming')}
        >
          🚜 Smart Farming
        </button>
        <button
          className={`nav-btn ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          🤝 Community Exchange
        </button>
        <button
          className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Farming Advisor
        </button>
      </nav>

      <main className="app-main">
        {!userId && (
          <div className="welcome-banner">
            <h2>Welcome to KebunKita! 👋</h2>
            <p>Please enter your User ID above to get started.</p>
          </div>
        )}

        {userId && (
          <>
            {activeTab === 'plant-health' && (
              <PlantHealth userId={userId} onError={handleError} />
            )}
            {activeTab === 'smart-farming' && (
              <SmartFarming userId={userId} onError={handleError} />
            )}
            {activeTab === 'community' && (
              <CommunityExchange userId={userId} onError={handleError} />
            )}
            {activeTab === 'chat' && (
              <DecisionSupport userId={userId} onError={handleError} />
            )}
          </>
        )}
      </main>

      <DebugConsole userId={userId} />
    </div>
  );
}

export default App;
