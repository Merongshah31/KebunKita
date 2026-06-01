import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../api/client';
import '../styles/agents.css';

export default function DecisionSupport({ userId, onError }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your farming advisor. Ask me anything about plant care, farming practices, or crop management.' }
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (!userId) {
      onError('User ID is required');
      return;
    }

    // Add user message to chat
    const userMsg = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const context = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      const response = await apiService.askDecisionSupport(userId, question, context);
      
      const assistantMsg = {
        role: 'assistant',
        content: response.data.answer || response.data.response || 'No response received',
        confidence: response.data.confidence,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg = {
        role: 'assistant',
        content: `Error: ${error.debugInfo?.message} (${error.debugInfo?.status}). Please try again.`,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      onError(`Error: ${error.debugInfo?.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-panel chat-panel">
      <h2>💬 Decision Support (Farming Advisor)</h2>
      <div className="chat-box">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Advisor'}:</strong> {msg.content}
            {msg.confidence && (
              <span className="confidence"> (confidence: {(msg.confidence * 100).toFixed(0)}%)</span>
            )}
          </div>
        ))}
        {loading && <div className="message assistant">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a farming question..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
