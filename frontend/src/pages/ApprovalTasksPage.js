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
  const [activeTab, setActiveTab] = useState('pending');

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

  const totalItems = pendingItems.length + approvedItems.length;
  const approvalRate = totalItems > 0 ? Math.round((approvedItems.length / totalItems) * 100) : 0;

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
    <div className="page-container lovable-page-shell approval-page">
          <div className="page-header">
            <div>
              <h1>{t('Task & Medicine Approvals')}</h1>
              <p>{t('Review and approve tasks and medicine logs')}</p>
            </div>
            <div className="lovable-header-actions">
              <div className="lovable-command-chip">
                <div className="lovable-command-ring">{approvalRate}%</div>
                <div className="lovable-command-copy">
                  <strong>{t('Approval Throughput')}</strong>
                  <span>{t('Review Console')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lovable-metric-strip">
            <div className="lovable-metric-card">
              <div className="lovable-metric-card-label">{t('Pending Reviews')}</div>
              <div className="lovable-metric-card-value">{pendingItems.length}</div>
              <div className="lovable-metric-card-sub">{t('Items awaiting decision right now')}</div>
            </div>
            <div className="lovable-metric-card">
              <div className="lovable-metric-card-label">{t('Approved')}</div>
              <div className="lovable-metric-card-value">{approvedItems.length}</div>
              <div className="lovable-metric-card-sub">{t('Items already cleared in this workspace')}</div>
            </div>
            <div className="lovable-metric-card">
              <div className="lovable-metric-card-label">{t('Task Reviews')}</div>
              <div className="lovable-metric-card-value">{pendingTasks.length + approvedTasks.length}</div>
              <div className="lovable-metric-card-sub">{t('Task approvals visible to this account')}</div>
            </div>
            <div className="lovable-metric-card">
              <div className="lovable-metric-card-label">{t('Medicine Reviews')}</div>
              <div className="lovable-metric-card-value">{pendingMedicineLogs.length + approvedMedicineLogs.length}</div>
              <div className="lovable-metric-card-sub">{t('Medicine log approvals in the current queue')}</div>
            </div>
          </div>

          {message && (
            <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <div className="lovable-grid-main">
            <div className="lovable-panel lovable-data-panel">
            <div className="lovable-pill-row" style={{ marginBottom: '16px' }}>
              <button
                className={`lovable-pill ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <span>{t('Pending Reviews')}</span>
                <span className="lovable-pill-count">{pendingItems.length}</span>
              </button>
              <button
                className={`lovable-pill ${activeTab === 'approved' ? 'active' : ''}`}
                onClick={() => setActiveTab('approved')}
              >
                <span>{t('Approved')}</span>
                <span className="lovable-pill-count">{approvedItems.length}</span>
              </button>
            </div>

            <div className="modern-tab-content">
              {activeTab === 'pending' && (
                <div className="approval-section">
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
              )}

              {activeTab === 'approved' && (
                <div className="approval-section approved-section">
                  {approvedItems.length === 0 ? (
                    <div className="no-tasks">
                      <p>✓ No approved items yet</p>
                    </div>
                  ) : (
                    <div className="approval-grid">
                      {approvedItems.map((item) => renderItemCard(item, true))}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>

            <div className="lovable-side-stack">
              <div className="lovable-panel">
                <div className="lovable-panel-title">{t('Approval Stats')}</div>
                <div className="lovable-panel-subtitle">{t('Live overview of the current decision queue')}</div>
                <div className="lovable-progress-row" style={{ marginTop: '16px' }}>
                  <div className="lovable-progress-head">
                    <span>{t('Approved Rate')}</span>
                    <strong>{approvalRate}%</strong>
                  </div>
                  <div className="lovable-progress-bar"><span style={{ width: `${approvalRate}%` }} /></div>
                </div>
                <div className="lovable-progress-row" style={{ marginTop: '14px' }}>
                  <div className="lovable-progress-head">
                    <span>{t('Pending Queue')}</span>
                    <strong>{pendingItems.length}</strong>
                  </div>
                  <div className="lovable-progress-bar"><span style={{ width: `${totalItems ? Math.max(8, Math.round((pendingItems.length / totalItems) * 100)) : 0}%` }} /></div>
                </div>
              </div>

              <div className="lovable-panel">
                <div className="lovable-panel-title">{t('Compliance')}</div>
                <div className="lovable-panel-subtitle">{t('All approval decisions should be cleared within the active SLA window')}</div>
                <div className="lovable-side-stack" style={{ marginTop: '16px' }}>
                  <div className="lovable-side-stat">
                    <div className="lovable-side-stat-icon">01</div>
                    <div className="lovable-side-stat-copy">
                      <strong>{pendingTasks.length} {t('Task Reviews')}</strong>
                      <span>{t('Pending or recently processed tasks')}</span>
                    </div>
                  </div>
                  <div className="lovable-side-stat">
                    <div className="lovable-side-stat-icon">02</div>
                    <div className="lovable-side-stat-copy">
                      <strong>{pendingMedicineLogs.length} {t('Medicine Reviews')}</strong>
                      <span>{t('Pending medicine log approvals')}</span>
                    </div>
                  </div>
                  <div className="lovable-side-stat">
                    <div className="lovable-side-stat-icon">03</div>
                    <div className="lovable-side-stat-copy">
                      <strong>{t('SLA: 24h Target')}</strong>
                      <span>{t('Pending items should be resolved quickly for audit clarity')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
};

export default ApprovalTasksPage;
