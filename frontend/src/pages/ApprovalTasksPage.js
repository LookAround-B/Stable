import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const ApprovalTasksPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
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
      <div key={task.id} className="approval-card">
        <div className="card-header">
          <h3>{task.name}</h3>
          <span className="task-type">{task.type}</span>
        </div>

        <div className="card-content">
          <p><strong>Description:</strong> {task.description || 'N/A'}</p>
          <p><strong>Created by:</strong> {task.createdBy?.fullName || 'Unknown'}</p>
          <p><strong>Assigned to:</strong> {task.assignedEmployee?.fullName || 'Unknown'}</p>
          <p><strong>Horse:</strong> {task.horse?.name || 'N/A'}</p>
          <p><strong>Priority:</strong> <span className={`priority ${task.priority}`}>{task.priority}</span></p>
          <p><strong>Scheduled:</strong> {new Date(task.scheduledTime).toLocaleString()}</p>
          {task.completionNotes && (
            <p><strong>Completion Notes:</strong> {task.completionNotes}</p>
          )}
          {isApproved && approverName && (
            <p><strong>Approved by:</strong> {approverName}</p>
          )}
          {isApproved && !approverName && task.approvals && task.approvals.length > 0 && (
            <p><strong>Status:</strong> Approved (by approver)</p>
          )}
        </div>

        {!isApproved && (
          <div className="card-actions">
            <button
              className="btn btn-approve"
              onClick={() => handleApproveTask(task.id)}
              disabled={loading}
            >
              ✓ Approve
            </button>
            <button
              className="btn btn-reject"
              onClick={() => handleRejectTask(task.id)}
              disabled={loading}
            >
              ✕ Reject
            </button>
          </div>
        )}
        {isApproved && (
          <div className="card-footer">
            <span className="status-badge approved">✔ Approved</span>
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
