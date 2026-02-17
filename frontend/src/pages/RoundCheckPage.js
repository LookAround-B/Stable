import React, { useState, useEffect, useCallback } from 'react';
import roundCheckService from '../services/roundCheckService';
import '../styles/RoundCheckPage.css';

const RoundCheckPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [roundCheck, setRoundCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [morningCompleted, setMorningCompleted] = useState(false);
  const [afternoonCompleted, setAfternoonCompleted] = useState(false);
  const [eveningCompleted, setEveningCompleted] = useState(false);

  const loadRoundCheck = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roundCheckService.getRoundCheck(selectedDate);
      setRoundCheck(data.roundCheck);
      
      if (data.roundCheck) {
        setMorningCompleted(data.roundCheck.morningCompleted);
        setAfternoonCompleted(data.roundCheck.afternoonCompleted);
        setEveningCompleted(data.roundCheck.eveningCompleted);
      } else {
        setMorningCompleted(false);
        setAfternoonCompleted(false);
        setEveningCompleted(false);
      }
    } catch (error) {
      console.error('Error loading round check:', error);
      setMessage(`✗ Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadRoundCheck();
  }, [loadRoundCheck]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!morningCompleted && !afternoonCompleted && !eveningCompleted) {
      setMessage('✗ Please mark at least one round as completed');
      return;
    }

    try {
      setLoading(true);
      await roundCheckService.updateRoundCheck(
        selectedDate,
        morningCompleted,
        afternoonCompleted,
        eveningCompleted
      );
      setMessage('✓ Round status updated successfully!');
      await loadRoundCheck();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="round-check-page">
      <div className="round-check-header">
        <h1>My Daily Rounds</h1>
        <p className="subtitle">Mark which rounds you have completed today</p>
      </div>

      {message && <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>{message}</div>}

      <div className="round-check-container">
        <div className="date-selector">
          <label htmlFor="date-input">Select Date</label>
          <input
            id="date-input"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loading}
          />
          <p className="date-display">{formatDate(selectedDate)}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounds-form">
          <h2>Rounds for {formatDate(selectedDate)}</h2>

          <div className="rounds-checkboxes">
            <div className="round-option">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="morning"
                  checked={morningCompleted}
                  onChange={(e) => setMorningCompleted(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="morning">
                  <span className="round-label">🌅 Morning Round</span>
                  <span className="round-time">(Early Morning)</span>
                </label>
              </div>
            </div>

            <div className="round-option">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="afternoon"
                  checked={afternoonCompleted}
                  onChange={(e) => setAfternoonCompleted(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="afternoon">
                  <span className="round-label">☀️ Afternoon Round</span>
                  <span className="round-time">(Mid Day)</span>
                </label>
              </div>
            </div>

            <div className="round-option">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="evening"
                  checked={eveningCompleted}
                  onChange={(e) => setEveningCompleted(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="evening">
                  <span className="round-label">🌙 Evening Round</span>
                  <span className="round-time">(Late Evening)</span>
                </label>
              </div>
            </div>
          </div>

          {roundCheck && (
            <div className="last-updated">
              <p>Last updated: {new Date(roundCheck.updatedAt).toLocaleString('en-GB')}</p>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={loading}
            >
              {loading ? '⏳ Updating...' : '✓ Save Round Status'}
            </button>
          </div>
        </form>

        <div className="info-box">
          <h3>ℹ️ Instructions</h3>
          <ul>
            <li>Check the boxes for rounds you have completed</li>
            <li>Mark at least one round</li>
            <li>Click "Save Round Status" to submit</li>
            <li>You can update your status throughout the day</li>
            <li>Your supervisor will see this information on the tracking dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoundCheckPage;
