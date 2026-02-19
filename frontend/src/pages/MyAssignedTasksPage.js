import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import '../styles/MyAssignedTasksPage.css';

const MyAssignedTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
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
    if (filterStatus === 'All') return true;
    return task.status === filterStatus;
  });

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
    <div className="page-container">
      <div className="page-header">
        <h1>📋 My Assigned Tasks</h1>
        <p>Complete and submit your assigned tasks with evidence</p>
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

      <div className="page-controls">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Tasks</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <span className="task-count">{filteredTasks.length} task(s)</span>
      </div>

      {loading && filteredTasks.length === 0 ? (
        <div className="loading">Loading your tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="no-tasks">
          <p>✓ No tasks assigned to you yet</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="card-status" style={{ backgroundColor: getStatusColor(task.status) }}>
                {task.status}
              </div>

              <div className="card-content">
                <h3>{task.name}</h3>
                <p className="task-type">{task.type}</p>
                
                <div className="task-details">
                  <p><strong>Description:</strong> {task.description || 'No description'}</p>
                  <p><strong>Horse:</strong> {task.horse?.name || 'N/A'}</p>
                  <p><strong>Priority:</strong> <span className={`priority ${task.priority}`}>{task.priority}</span></p>
                  <p><strong>Created by:</strong> {task.createdBy?.fullName || 'Unknown'}</p>
                  <p><strong>Scheduled:</strong> {new Date(task.scheduledTime).toLocaleString()}</p>
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

              <div className="card-actions">
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
                    {task.status === 'Approved' && <p className="approved">✓ Approved</p>}
                    {task.status === 'Rejected' && <p className="rejected">✗ Rejected</p>}
                    {task.status === 'Pending Review' && <p className="pending">⏳ Awaiting Review</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTaskId && (
        <div className="modal-overlay" onClick={() => setSelectedTaskId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Task Completion</h2>
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
