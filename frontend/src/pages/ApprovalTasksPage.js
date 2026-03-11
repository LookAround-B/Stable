import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { useI18n } from '../context/I18nContext';

const ApprovalTasksPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [approvedTasks, setApprovedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Only parent roles can approve tasks
  const PARENT_ROLES = ['Director', 'School Administrator', 'Stable Manager'];

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
    // Find the approval record (prefer "Approved" status)
    const approval = task.approvals?.find(a => a.status === 'Approved') || task.approvals?.[0];
    const approverName = approval?.approver?.fullName;
    
    // Debug: log the task data to see what we're getting
    if (isApproved) {
      console.log('Approved Task:', {
        name: task.name,
        hasApprovals: !!task.approvals,
        approvalsLength: task.approvals?.length,
        approval: approval,
        approverName: approverName
      });
    }
    
    return (
      <div key={task.id} className="approval-card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '18px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{task.name}</h3>
          <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#6366f122', color: '#6366f1' }}>{task.type}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>
          <div><span style={{ color: 'var(--text-secondary)' }}>Assigned to:</span> <strong>{task.assignedEmployee?.fullName || 'Unknown'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Created by:</span> <strong>{task.createdBy?.fullName || 'Unknown'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Horse:</span> <strong>{task.horse?.name || 'N/A'}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Priority:</span> <strong>{task.priority}</strong></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Scheduled:</span> <strong>{new Date(task.scheduledTime).toLocaleString('en-IN')}</strong></div>
          {task.completedTime && (
            <div><span style={{ color: 'var(--text-secondary)' }}>Completed:</span> <strong>{new Date(task.completedTime).toLocaleString('en-IN')}</strong></div>
          )}
          {isApproved && approverName && (
            <div><span style={{ color: 'var(--text-secondary)' }}>Approved by:</span> <strong>{approverName}</strong></div>
          )}
        </div>

        {task.description && (
          <div style={{ marginBottom: '10px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Description:</span>
            <p style={{ margin: '4px 0 0', color: 'var(--text-primary)' }}>{task.description}</p>
          </div>
        )}

        {task.completionNotes && (
          <div style={{ marginBottom: '10px', fontSize: '0.85rem', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '8px 12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Employee Notes:</span>
            <p style={{ margin: '4px 0 0', color: 'var(--text-primary)' }}>{task.completionNotes}</p>
          </div>
        )}

        {task.proofImage && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>Evidence Photo:</p>
            <img
              src={task.proofImage}
              alt="Task proof"
              style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-primary)', cursor: 'pointer' }}
              onClick={() => window.open(task.proofImage, '_blank')}
            />
          </div>
        )}

        {!isApproved && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => handleApproveTask(task.id)}
              disabled={loading}
              style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '0.875rem' }}
            >
              ✓ {t('Approve')}
            </button>
            <button
              onClick={() => handleRejectTask(task.id)}
              disabled={loading}
              style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '0.875rem' }}
            >
              ✕ {t('Reject')}
            </button>
          </div>
        )}
        {isApproved && (
          <div style={{ marginTop: '8px' }}>
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: '#22c55e22', color: '#16a34a' }}>✔ Approved</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      {!PARENT_ROLES.includes(user?.designation) ? (
        <div className="error-message">
          <h2>{t('Access Denied')}</h2>
          <p>Only Director, School Administrator, and Stable Manager can approve tasks.</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default ApprovalTasksPage;
