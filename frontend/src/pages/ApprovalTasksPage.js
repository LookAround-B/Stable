import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const ApprovalTasksPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [approvedTasks, setApprovedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Only parent roles can approve tasks
  // const PARENT_ROLES = ['Director', 'School Administrator', 'Stable Manager'];

  useEffect(() => {
    loadAllTasks();
  }, []);

  const loadAllTasks = async () => {
    try {
      setLoading(true);
      // Load pending tasks
      const pendingResponse = await apiClient.get('/tasks', {
        params: { status: 'Pending Review' }
      });
      setPendingTasks(pendingResponse.data.data || []);

      // Load approved tasks
      const approvedResponse = await apiClient.get('/tasks', {
        params: { status: 'Approved' }
      });
      setApprovedTasks(approvedResponse.data.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setMessage('✗ Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      setLoading(true);
      const approvedTask = pendingTasks.find(t => t.id === taskId);
      await apiClient.patch(`/tasks/${taskId}`, { status: 'Approved' });
      setPendingTasks(pendingTasks.filter(t => t.id !== taskId));
      setApprovedTasks([approvedTask, ...approvedTasks]);
      setMessage('✓ Task approved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTask = async (taskId) => {
    try {
      setLoading(true);
      await apiClient.patch(`/tasks/${taskId}`, { status: 'Rejected' });
      setPendingTasks(pendingTasks.filter(t => t.id !== taskId));
      setMessage('✓ Task rejected');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderTaskCard = (task, isApproved = false) => {
    const approval = task.approvals?.find(a => a.status === 'Approved') || task.approvals?.[0];
    const approverName = approval?.approver?.fullName;
    
    return (
      <div key={task.id} className="approval-card card">
        <div className="approval-card-header">
          <h3 className="approval-card-title">{task.name}</h3>
          <span className="approval-type-badge">{task.type}</span>
        </div>

        <div className="approval-card-details">
          <div><span className="detail-label">Assigned to:</span> <strong>{task.assignedEmployee?.fullName || 'Unknown'}</strong></div>
          <div><span className="detail-label">Created by:</span> <strong>{task.createdBy?.fullName || 'Unknown'}</strong></div>
          <div><span className="detail-label">Horse:</span> <strong>{task.horse?.name || 'N/A'}</strong></div>
          <div><span className="detail-label">Priority:</span> <strong>{task.priority}</strong></div>
          <div><span className="detail-label">Scheduled:</span> <strong>{new Date(task.scheduledTime).toLocaleString('en-IN')}</strong></div>
          {task.completedTime && (
            <div><span className="detail-label">Completed:</span> <strong>{new Date(task.completedTime).toLocaleString('en-IN')}</strong></div>
          )}
          {isApproved && approverName && (
            <div><span className="detail-label">Approved by:</span> <strong>{approverName}</strong></div>
          )}
        </div>

        {task.description && (
          <div className="approval-card-desc">
            <span className="detail-label">Description:</span>
            <p>{task.description}</p>
          </div>
        )}

        {task.completionNotes && (
          <div className="approval-card-notes">
            <span className="detail-label">Employee Notes:</span>
            <p>{task.completionNotes}</p>
          </div>
        )}

        {task.proofImage && (
          <div className="approval-card-evidence">
            <p className="detail-label">Evidence Photo:</p>
            <img
              src={task.proofImage}
              alt="Task proof"
              className="approval-evidence-img"
              onClick={() => window.open(task.proofImage, '_blank')}
            />
          </div>
        )}

        {!isApproved && (
          <div className="approval-card-actions">
            <button
              onClick={() => handleApproveTask(task.id)}
              disabled={loading}
              className="btn-approve"
            >
              ✓ {t('Approve')}
            </button>
            <button
              onClick={() => handleRejectTask(task.id)}
              disabled={loading}
              className="btn-reject"
            >
              ✕ {t('Reject')}
            </button>
          </div>
        )}
        {isApproved && (
          <div className="approval-card-status">
            <span className="status-approved-badge">✔ Approved</span>
          </div>
        )}
      </div>
    );
  };

  if (!p.viewApprovals) return <Navigate to="/" replace />;

  return (
    <div className="page-container">
          <div className="approval-header">
            <h1>{t('Task Approvals')}</h1>
            <p>Review and approve tasks created by Instructors</p>
          </div>

          {message && (
            <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          {/* PENDING TASKS SECTION */}
          <div className="approval-section">
            <div className="section-header">
              <h2>{t('Pending Review')}</h2>
              <span className="task-count">{pendingTasks.length} tasks</span>
            </div>

            {loading && pendingTasks.length === 0 ? (
              <div className="loading">Loading pending tasks...</div>
            ) : pendingTasks.length === 0 ? (
              <div className="no-tasks">
                <p>✓ No pending tasks to review</p>
              </div>
            ) : (
              <div className="approval-grid">
                {pendingTasks.map((task) => renderTaskCard(task, false))}
              </div>
            )}
          </div>

          {/* APPROVED TASKS SECTION */}
          {approvedTasks.length > 0 && (
            <div className="approval-section approved-section">
              <div className="section-header">
                <h2>{t('Approved Tasks')}</h2>
                <span className="task-count">{approvedTasks.length} tasks</span>
              </div>

              <div className="approval-grid">
                {approvedTasks.map((task) => renderTaskCard(task, true))}
              </div>
            </div>
          )}
    </div>
  );
};

export default ApprovalTasksPage;
