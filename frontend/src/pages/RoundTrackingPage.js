import React, { useState, useEffect, useCallback } from 'react';
import roundCheckService from '../services/roundCheckService';
import '../styles/RoundTrackingPage.css';

const RoundTrackingPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [roundChecks, setRoundChecks] = useState([]);
  const [missingJamedars, setMissingJamedars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadRoundTracking = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roundCheckService.getRoundCheck(selectedDate);
      setRoundChecks(data.roundChecks || []);
      setMissingJamedars(data.missingJamedars || []);
    } catch (error) {
      console.error('Error loading round tracking:', error);
      setMessage(`✗ Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadRoundTracking();
  }, [loadRoundTracking]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCompletionStatus = (morning, afternoon, evening) => {
    const completed = [morning, afternoon, evening].filter(Boolean).length;
    return {
      count: completed,
      total: 3,
      percentage: Math.round((completed / 3) * 100),
    };
  };

  const getStatusColor = (percentage) => {
    if (percentage === 100) return '#4CAF50'; // Green
    if (percentage === 0) return '#d32f2f'; // Red
    return '#ff9800'; // Orange
  };

  const totalJamedars = roundChecks.length + missingJamedars.length;
  const allCompleted = roundChecks.filter(r => r.morningCompleted && r.afternoonCompleted && r.eveningCompleted).length;
  const partiallyCompleted = roundChecks.filter(r => 
    (r.morningCompleted || r.afternoonCompleted || r.eveningCompleted) && 
    !(r.morningCompleted && r.afternoonCompleted && r.eveningCompleted)
  ).length;

  return (
    <div className="round-tracking-page">
      <div className="tracking-header">
        <h1>Jamedar Round Tracking</h1>
        <p className="subtitle">Monitor all Jamedars' daily round completions</p>
      </div>

      {message && <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>{message}</div>}

      <div className="tracking-container">
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

        {/* Summary Stats */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-number">{totalJamedars}</div>
            <div className="card-label">Total Jamedars</div>
          </div>
          <div className="summary-card success">
            <div className="card-number">{allCompleted}</div>
            <div className="card-label">All Rounds Done</div>
          </div>
          <div className="summary-card partial">
            <div className="card-number">{partiallyCompleted}</div>
            <div className="card-label">Partial Rounds</div>
          </div>
          <div className="summary-card missing">
            <div className="card-number">{missingJamedars.length}</div>
            <div className="card-label">No Updates</div>
          </div>
        </div>

        {loading && <p className="loading-text">⏳ Loading round tracking data...</p>}

        {!loading && (
          <>
            {/* Jamedars with Updates */}
            {roundChecks.length > 0 && (
              <div className="tracking-section">
                <h2>✓ Jamedars with Updates ({roundChecks.length})</h2>
                <div className="tracking-table-wrapper">
                  <table className="tracking-table">
                    <thead>
                      <tr>
                        <th>Jamedar Name</th>
                        <th>Morning</th>
                        <th>Afternoon</th>
                        <th>Evening</th>
                        <th>Completion</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundChecks.map((roundCheck) => {
                        const status = getCompletionStatus(
                          roundCheck.morningCompleted,
                          roundCheck.afternoonCompleted,
                          roundCheck.eveningCompleted
                        );
                        return (
                          <tr key={roundCheck.id}>
                            <td className="jamedar-name">
                              <strong>{roundCheck.jamedar.fullName}</strong>
                              <span className="email">{roundCheck.jamedar.email}</span>
                            </td>
                            <td>
                              {roundCheck.morningCompleted ? (
                                <span className="badge completed">✓ Done</span>
                              ) : (
                                <span className="badge pending">⊘ Pending</span>
                              )}
                            </td>
                            <td>
                              {roundCheck.afternoonCompleted ? (
                                <span className="badge completed">✓ Done</span>
                              ) : (
                                <span className="badge pending">⊘ Pending</span>
                              )}
                            </td>
                            <td>
                              {roundCheck.eveningCompleted ? (
                                <span className="badge completed">✓ Done</span>
                              ) : (
                                <span className="badge pending">⊘ Pending</span>
                              )}
                            </td>
                            <td>
                              <div className="progress-cell">
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill"
                                    style={{ 
                                      width: `${status.percentage}%`,
                                      backgroundColor: getStatusColor(status.percentage)
                                    }}
                                  />
                                </div>
                                <span className="progress-text">{status.count}/{status.total}</span>
                              </div>
                            </td>
                            <td className="timestamp">
                              {new Date(roundCheck.updatedAt).toLocaleTimeString('en-GB', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jamedars without Updates */}
            {missingJamedars.length > 0 && (
              <div className="tracking-section">
                <h2>⚠️ No Updates ({missingJamedars.length})</h2>
                <div className="missing-jamedar-list">
                  {missingJamedars.map((jamedar) => (
                    <div key={jamedar.id} className="missing-card">
                      <div className="missing-icon">!</div>
                      <div className="missing-info">
                        <strong>{jamedar.fullName}</strong>
                        <span>{jamedar.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {roundChecks.length === 0 && missingJamedars.length === 0 && (
              <div className="empty-state">
                <p>No Jamedars found in the system</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RoundTrackingPage;
