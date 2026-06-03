import React, { useCallback, useRef, useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function DecisionSupport({ userId, onError }) {
  const [budgetRm, setBudgetRm] = useState('');
  const [timelineWeeks, setTimelineWeeks] = useState('');
  const [space, setSpace] = useState('');
  const [goal, setGoal] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const endRef = useRef(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await apiService.getMemory(userId);
      const items = Array.isArray(response.data?.history) ? response.data.history : [];
      const historyMessages = items
        .filter((entry) => entry.agent_name === 'decision_support')
        .flatMap((entry) => {
          const payload = entry.payload || {};
          const nextMessages = [];
          if (payload.chat_message) {
            nextMessages.push({ role: 'user', content: payload.chat_message });
          }
          if (payload.answer) {
            nextMessages.push({
              role: 'advisor',
              content: payload.answer,
              recommendations: payload.recommendations || [],
            });
          }
          return nextMessages;
        })
        .reverse();
      setMessages(historyMessages);
    } catch (error) {
      setMessages([]);
      setHistoryError(error.debugInfo?.message || error.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    if (!budgetRm || !timelineWeeks || !space.trim() || !goal.trim()) {
      onError('Fill in budget, timeline, space, and goal before sending a live advisor question.');
      return;
    }

    const userMessage = { role: 'user', content: message };
    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await apiService.askDecisionSupport(userId, {
        budgetRm,
        timelineWeeks,
        space,
        goal,
        chatMessage: message,
      });
      setMessages((current) => [...current, {
        role: 'advisor',
        content: response.data.answer,
        recommendations: response.data.recommendations,
      }]);
      await loadHistory();
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (error) {
      onError(`Advisor failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="agent-panel decision-panel">
      <div className="agent-title">
        <div>
          <span className="agent-kicker">Decision support</span>
          <h3>Ask the farming advisor</h3>
        </div>
        <span className="agent-badge">5 free chats</span>
      </div>

      <div className="advisor-context">
        <label>
          Budget RM
          <input value={budgetRm} onChange={(event) => setBudgetRm(event.target.value)} />
        </label>
        <label>
          Timeline weeks
          <input value={timelineWeeks} onChange={(event) => setTimelineWeeks(event.target.value)} />
        </label>
        <label>
          Space
          <input value={space} onChange={(event) => setSpace(event.target.value)} />
        </label>
        <label>
          Goal
          <input value={goal} onChange={(event) => setGoal(event.target.value)} />
        </label>
      </div>

      <div className="chat-window">
        {historyLoading ? (
          <div className="chat-message advisor">Loading advisor history...</div>
        ) : historyError ? (
          <div className="chat-message advisor">Could not load advisor history: {historyError}</div>
        ) : messages.length === 0 ? (
          <div className="chat-message advisor">No advisor history yet. Send a live question to start.</div>
        ) : messages.map((item, index) => (
          <div className={`chat-message ${item.role}`} key={`${item.role}-${index}`}>
            <p>{item.content}</p>
            {item.recommendations && (
              <div className="mini-list">
                {item.recommendations.map((recommendation) => (
                  <span key={recommendation}>{recommendation}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="chat-message advisor">Thinking through your garden plan...</div>}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about crops, budget, care, or harvest timing"
        />
        <button className="primary-button" disabled={loading} type="submit">
          Send
        </button>
      </form>
    </article>
  );
}
