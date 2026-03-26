import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useI18n } from '../context/I18nContext';

const MyAssignedTasksPage = () => {
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [submissionData, setSubmissionData] = useState({
    proofImage: '',
    completionNotes: '',
  });

  useEffect(() => {
    loadAssignedTasks();
  }, []);

  // ESC key handler for fullscreen image
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setFullscreenImage(null);
      }
    };
    
    if (fullscreenImage) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [fullscreenImage]);

  const loadAssignedTasks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/tasks/my-tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setMessage('✗ Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmissionData((prev) => ({
        ...prev,
        proofImage: response.data.url || response.data.path,
      }));
    } catch (error) {
      setMessage('✗ Failed to upload image');
    }
  };

  const handleSubmitTask = async (taskId) => {
    try {
      if (!submissionData.proofImage) {
        setMessage('✗ Please upload proof image before submitting');
        return;
      }

      setLoading(true);
      await apiClient.patch(`/tasks/${taskId}/submit-completion`, {
        proofImage: submissionData.proofImage,
        completionNotes: submissionData.completionNotes,
      });

      setMessage('✓ Task submitted successfully! Awaiting approval...');
      setSelectedTaskId(null);
      setSubmissionData({ proofImage: '', completionNotes: '' });
      loadAssignedTasks();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      setLoading(true);
      await apiClient.patch(`/tasks/${taskId}`, { status: 'In Progress' });
      setMessage('✓ Task started!');
      loadAssignedTasks();
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const statusMatch = filterStatus === 'All' || task.status === filterStatus;
    const searchMatch = 
      task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.horse?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.createdBy?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && (searchTerm === '' || searchMatch);
  });

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((task) => task.status === 'Pending').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'In Progress').length;
  const reviewTasks = tasks.filter((task) => task.status === 'Pending Review').length;
  const approvedTasks = tasks.filter((task) => task.status === 'Approved').length;
  const completionRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;
  const statusPills = [
    { key: 'All', label: t('All Tasks'), count: totalTasks },
    { key: 'Pending', label: t('Pending'), count: pendingTasks },
    { key: 'In Progress', label: t('In Progress'), count: inProgressTasks },
    { key: 'Pending Review', label: t('Pending Review'), count: reviewTasks },
    { key: 'Approved', label: t('Approved'), count: approvedTasks },
  ];

  const getStatusColor = (status) => {
    const colors = {
      'Pending': '#3498db',
      'In Progress': '#f39c12',
      'Pending Review': '#e74c3c',
      'Approved': '#27ae60',
      'Rejected': '#95a5a6',
    };
    return colors[status] || '#95a5a6';
  };

  return (
    <div className="page-container lovable-page-shell my-assigned-page">
      <div className="page-header">
        <div>
          <div className="lovable-header-kicker">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>{t('Personal Task Console')}</span>
          </div>
          <h1>{t('My Assigned Tasks')}</h1>
          <p>{t('Complete and submit your assigned tasks with evidence')}</p>
        </div>
        <div className="lovable-header-actions">
          <div className="lovable-command-chip">
            <div className="lovable-command-ring">{completionRate}%</div>
            <div className="lovable-command-copy">
              <strong>{t('Progress Matrix')}</strong>
              <span>{t('Personal Task Console')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lovable-metric-strip">
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Assigned')}</div>
          <div className="lovable-metric-card-value">{totalTasks}</div>
          <div className="lovable-metric-card-sub">{t('Tasks currently visible in your queue')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('In Progress')}</div>
          <div className="lovable-metric-card-value">{inProgressTasks}</div>
          <div className="lovable-metric-card-sub">{t('Tasks you have already started')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Pending Review')}</div>
          <div className="lovable-metric-card-value">{reviewTasks}</div>
          <div className="lovable-metric-card-sub">{t('Completions currently awaiting approval')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Approved')}</div>
          <div className="lovable-metric-card-value">{approvedTasks}</div>
          <div className="lovable-metric-card-sub">{t('Tasks fully cleared and completed')}</div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {fullscreenImage && (
        <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="Full size" className="fullscreen-image" />
          <button className="close-fullscreen" onClick={() => setFullscreenImage(null)}>✕</button>
        </div>
      )}

      <div className="task-filters">
        <div className="lovable-pill-row">
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              className={`lovable-pill ${filterStatus === pill.key ? 'active' : ''}`}
              onClick={() => setFilterStatus(pill.key)}
            >
              <span>{pill.label}</span>
              <span className="lovable-pill-count">{pill.count}</span>
            </button>
          ))}
        </div>
        <div className="search-input">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            placeholder={t('Search tasks by name, type, horse...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="lovable-grid-main">
      {loading && filteredTasks.length === 0 ? (
        <div className="loading">Loading your tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="no-tasks">
          <p>✓ No tasks assigned to you yet</p>
        </div>
      ) : (
        <div className="tasks-grid tasks-list">
          {filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <h3>{task.name}</h3>
                <span
                  className="priority-badge"
                  style={{ backgroundColor: getStatusColor(task.priority === 'High' ? 'Rejected' : task.priority === 'Medium' ? 'In Progress' : 'Approved'), padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {task.priority}
                </span>
              </div>
              <p className="task-type" style={{ fontWeight: 700, color: '#000', fontSize: '1.0625rem' }}>{task.type}</p>

              <div className="task-status-row">
                <div className="card-status" style={{ backgroundColor: getStatusColor(task.status), padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, display: 'inline-block' }}>
                  {t(task.status)}
                </div>
              </div>

              <hr className="task-divider" />

              <div className="task-details-section">
                <h4 className="task-details-heading">{t('Details')}</h4>
                <div className="task-details">
                  <p><strong>Description:</strong> <span>{task.description || 'No description'}</span></p>
                  <p><strong>Horse:</strong> <span>{task.horse?.name || 'N/A'}</span></p>
                  <p><strong>Created by:</strong> <span>{task.createdBy?.fullName || 'Unknown'}</span></p>
                  <p><strong>Scheduled:</strong> <span>{new Date(task.scheduledTime).toLocaleString()}</span></p>
                </div>

                {task.proofImage && (
                  <div className="proof-section">
                    <p><strong>Evidence:</strong></p>
                    <img 
                      src={task.proofImage} 
                      alt="Task evidence" 
                      className="proof-thumbnail"
                      onClick={() => setFullscreenImage(task.proofImage)}
                    />
                  </div>
                )}

                {task.completionNotes && (
                  <div className="notes-section">
                    <p><strong>Completion Notes:</strong> {task.completionNotes}</p>
                  </div>
                )}

                {task.submittedAt && (
                  <p className="submitted-at">
                    <strong>Submitted:</strong> {new Date(task.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="card-actions" style={{ marginTop: '12px' }}>
                {task.status === 'Pending' && (
                  <button
                    className="btn btn-start"
                    onClick={() => handleStartTask(task.id)}
                    disabled={loading}
                  >
                    ► Start Task
                  </button>
                )}

                {task.status === 'In Progress' && (
                  <button
                    className="btn btn-submit"
                    onClick={() => setSelectedTaskId(task.id)}
                    disabled={loading}
                  >
                    ✓ Submit Completion
                  </button>
                )}

                {(task.status === 'Pending Review' || task.status === 'Approved' || task.status === 'Rejected') && (
                  <div className="status-info">
                    {task.status === 'Approved' && <p className="approved">✔ Approved</p>}
                    {task.status === 'Rejected' && <p className="rejected">✗ Rejected</p>}
                    {task.status === 'Pending Review' && <p className="pending">⏳ Awaiting Review</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="lovable-side-stack">
        <div className="lovable-panel">
          <div className="lovable-panel-title">{t('Shift Focus')}</div>
          <div className="lovable-panel-subtitle">{t('Quick readout for your current task board')}</div>
          <div className="lovable-progress-row" style={{ marginTop: '16px' }}>
            <div className="lovable-progress-head">
              <span>{t('Approved')}</span>
              <strong>{completionRate}%</strong>
            </div>
            <div className="lovable-progress-bar"><span style={{ width: `${completionRate}%` }} /></div>
          </div>
          <div className="lovable-progress-row" style={{ marginTop: '14px' }}>
            <div className="lovable-progress-head">
              <span>{t('Awaiting Review')}</span>
              <strong>{reviewTasks}</strong>
            </div>
            <div className="lovable-progress-bar"><span style={{ width: `${totalTasks ? Math.max(8, Math.round((reviewTasks / totalTasks) * 100)) : 0}%` }} /></div>
          </div>
        </div>

        <div className="lovable-panel">
          <div className="lovable-panel-title">{t('Execution Notes')}</div>
          <div className="lovable-panel-subtitle">{t('Evidence is required before completion can be submitted')}</div>
          <div className="lovable-side-stack" style={{ marginTop: '16px' }}>
            <div className="lovable-side-stat">
              <div className="lovable-side-stat-icon">01</div>
              <div className="lovable-side-stat-copy">
                <strong>{pendingTasks} {t('Ready to Start')}</strong>
                <span>{t('Tasks sitting in your pending queue')}</span>
              </div>
            </div>
            <div className="lovable-side-stat">
              <div className="lovable-side-stat-icon">02</div>
              <div className="lovable-side-stat-copy">
                <strong>{inProgressTasks} {t('Live Tasks')}</strong>
                <span>{t('Currently active tasks under execution')}</span>
              </div>
            </div>
            <div className="lovable-side-stat">
              <div className="lovable-side-stat-icon">03</div>
              <div className="lovable-side-stat-copy">
                <strong>{t('Upload Proof')}</strong>
                <span>{t('Completion photos and notes keep the approval flow moving')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {selectedTaskId && (
        <div className="modal-overlay" onClick={() => setSelectedTaskId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('Submit Task Completion')}</h2>
              <button className="close-btn" onClick={() => setSelectedTaskId(null)}>✕</button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Upload Evidence Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={loading}
                />
                {submissionData.proofImage && (
                  <div className="image-preview">
                    <img src={submissionData.proofImage} alt="Preview" />
                    <span className="upload-success">✓ Photo uploaded</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Completion Notes (Optional)</label>
                <textarea
                  value={submissionData.completionNotes}
                  onChange={(e) => setSubmissionData((prev) => ({
                    ...prev,
                    completionNotes: e.target.value,
                  }))}
                  placeholder="Any notes about task completion..."
                  rows="4"
                  disabled={loading}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setSelectedTaskId(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-submit-modal"
                  onClick={() => handleSubmitTask(selectedTaskId)}
                  disabled={loading || !submissionData.proofImage}
                >
                  {loading ? 'Submitting...' : 'Submit Completion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssignedTasksPage;
