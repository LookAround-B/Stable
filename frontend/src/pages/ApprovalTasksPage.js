import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import medicineLogService from '../services/medicineLogService';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const ApprovalTasksPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [approvedTasks, setApprovedTasks] = useState([]);
  const [pendingMedicineLogs, setPendingMedicineLogs] = useState([]);
  const [approvedMedicineLogs, setApprovedMedicineLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

      // Load pending medicine logs
      try {
        const pendingMedResponse = await medicineLogService.getPendingMedicineLogs();
        setPendingMedicineLogs(pendingMedResponse.data || []);
      } catch (err) {
        console.error('Error loading pending medicine logs', err);
      }

      // Load approved medicine logs
      try {
        const approvedMedResponse = await medicineLogService.getMedicineLogs({ status: 'approved' });
        setApprovedMedicineLogs(approvedMedResponse.data || []);
      } catch (err) {
        console.error('Error loading approved medicine logs', err);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('✗ Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = async (itemId, type) => {
    try {
      setLoading(true);
      if (type === 'task') {
        const approvedTask = pendingTasks.find(t => t.id === itemId);
        await apiClient.patch(`/tasks/${itemId}`, { status: 'Approved' });
        setPendingTasks(pendingTasks.filter(t => t.id !== itemId));
        setApprovedTasks([approvedTask, ...approvedTasks]);
      } else {
        const approvedLog = pendingMedicineLogs.find(m => m.id === itemId);
        await medicineLogService.approveMedicineLog(itemId);
        setPendingMedicineLogs(pendingMedicineLogs.filter(m => m.id !== itemId));
        setApprovedMedicineLogs([approvedLog, ...approvedMedicineLogs]);
      }
      setMessage('✓ Item approved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectItem = async (itemId, type) => {
    try {
      setLoading(true);
      if (type === 'task') {
        await apiClient.patch(`/tasks/${itemId}`, { status: 'Rejected' });
        setPendingTasks(pendingTasks.filter(t => t.id !== itemId));
      } else {
        await medicineLogService.rejectMedicineLog(itemId, 'Rejected');
        setPendingMedicineLogs(pendingMedicineLogs.filter(m => m.id !== itemId));
      }
      setMessage('✓ Item rejected');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pendingItems = [
    ...pendingTasks.map(t => ({ ...t, itemType: 'task' })),
    ...pendingMedicineLogs.map(m => ({ ...m, itemType: 'medicine' }))
  ].sort((a, b) => new Date(b.createdAt || b.timeAdministered) - new Date(a.createdAt || a.timeAdministered));

  const approvedItems = [
    ...approvedTasks.map(t => ({ ...t, itemType: 'task' })),
    ...approvedMedicineLogs.map(m => ({ ...m, itemType: 'medicine' }))
  ].sort((a, b) => new Date(b.createdAt || b.timeAdministered) - new Date(a.createdAt || a.timeAdministered));

  const renderItemCard = (item, isApproved = false) => {
    const isTask = item.itemType === 'task';
    
    // Helper to get approver name for tasks
    const taskApproval = isTask ? (item.approvals?.find(a => a.status === 'Approved') || item.approvals?.[0]) : null;
    const taskApproverName = taskApproval?.approver?.fullName;
    
    return (
      <div key={item.id} className="approval-card card">
        <div className="approval-card-header">
          <h3 className="approval-card-title">{isTask ? item.name : item.medicineName}</h3>
          <span className="approval-type-badge">{isTask ? item.type : 'Medicine Log'}</span>
        </div>

        <div className="approval-card-details">
         {isTask ? (
           <>
             <div><span className="detail-label">Assigned to:</span> <strong>{item.assignedEmployee?.fullName || 'Unknown'}</strong></div>
             <div><span className="detail-label">Created by:</span> <strong>{item.createdBy?.fullName || 'Unknown'}</strong></div>
             <div><span className="detail-label">Horse:</span> <strong>{item.horse?.name || 'N/A'}</strong></div>
             <div><span className="detail-label">Priority:</span> <strong>{item.priority}</strong></div>
             <div><span className="detail-label">Scheduled:</span> <strong>{new Date(item.scheduledTime).toLocaleString('en-IN')}</strong></div>
             {item.completedTime && (
               <div><span className="detail-label">Completed:</span> <strong>{new Date(item.completedTime).toLocaleString('en-IN')}</strong></div>
             )}
             {isApproved && taskApproverName && (
               <div><span className="detail-label">Approved by:</span> <strong>{taskApproverName}</strong></div>
             )}
           </>
         ) : (
           <>
             <div><span className="detail-label">Administered by:</span> <strong>{item.jamedar?.fullName || 'Unknown'}</strong></div>
             <div><span className="detail-label">Horse:</span> <strong>{item.horse?.name || 'N/A'}</strong></div>
             <div><span className="detail-label">Quantity:</span> <strong>{item.quantity} {item.unit}</strong></div>
             <div><span className="detail-label">Time:</span> <strong>{new Date(item.timeAdministered).toLocaleString('en-IN')}</strong></div>
             {isApproved && item.approvedBy?.fullName && (
               <div><span className="detail-label">Approved by:</span> <strong>{item.approvedBy.fullName}</strong></div>
             )}
           </>
         )}
        </div>

        {item.description && isTask && (
          <div className="approval-card-desc">
            <span className="detail-label">Description:</span>
            <p>{item.description}</p>
          </div>
        )}

        {item.completionNotes && isTask && (
          <div className="approval-card-notes">
            <span className="detail-label">Employee Notes:</span>
            <p>{item.completionNotes}</p>
          </div>
        )}

        {item.notes && !isTask && (
          <div className="approval-card-notes">
            <span className="detail-label">Notes:</span>
            <p>{item.notes}</p>
          </div>
        )}

        {(item.proofImage || item.photoUrl) && (
          <div className="approval-card-evidence">
            <p className="detail-label">Evidence Photo:</p>
            <img
              src={item.proofImage || item.photoUrl}
              alt="Evidence proof"
              className="approval-evidence-img"
              onClick={() => window.open(item.proofImage || item.photoUrl, '_blank')}
            />
          </div>
        )}

        {!isApproved && (
          <div className="approval-card-actions">
            <button
              onClick={() => handleApproveItem(item.id, item.itemType)}
              disabled={loading}
              className="btn-approve"
            >
              ✓ {t('Approve')}
            </button>
            <button
              onClick={() => handleRejectItem(item.id, item.itemType)}
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
            <h1>{t('Task & Medicine Approvals')}</h1>
            <p>Review and approve tasks and medicine logs</p>
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
              <span className="task-count">{pendingItems.length} items</span>
            </div>

            {loading && pendingItems.length === 0 ? (
              <div className="loading">Loading pending items...</div>
            ) : pendingItems.length === 0 ? (
              <div className="no-tasks">
                <p>✓ No pending items to review</p>
              </div>
            ) : (
              <div className="approval-grid">
                {pendingItems.map((item) => renderItemCard(item, false))}
              </div>
            )}
          </div>

          {/* APPROVED TASKS SECTION */}
          {approvedItems.length > 0 && (
            <div className="approval-section approved-section">
              <div className="section-header">
                <h2>{t('Approved Items')}</h2>
                <span className="task-count">{approvedItems.length} items</span>
              </div>

              <div className="approval-grid">
                {approvedItems.map((item) => renderItemCard(item, true))}
              </div>
            </div>
          )}
    </div>
  );
};

export default ApprovalTasksPage;

