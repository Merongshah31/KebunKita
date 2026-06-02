import React, { useRef, useState } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function DecisionSupport({ userId, onError }) {
  const [budgetRm, setBudgetRm] = useState('80');
  const [timelineWeeks, setTimelineWeeks] = useState('8');
  const [space, setSpace] = useState('Apartment balcony with morning sun');
  const [goal, setGoal] = useState('Grow fast vegetables for weekly cooking');
  const [message, setMessage] = useState('What should I grow next in a small balcony?');
  const [messages, setMessages] = useState([
    {
      role: 'advisor',
      content: 'Tell me your budget, timeline, space, and goal. I will suggest a practical growing plan.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;

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
      setMessages((current) => [
        ...current,
        {
          role: 'advisor',
          content: response.data.answer,
          recommendations: response.data.recommendations,
        },
      ]);
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
        {messages.map((item, index) => (
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
