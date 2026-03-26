import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, BarChart3, Shield } from 'lucide-react';
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
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filters = ['All', 'Pending', 'Approved', 'Rejected'];

  useEffect(() => {
    loadAllTasks();
  }, []);

  const loadAllTasks = async () => {
    try {
      setLoading(true);
      const [pendingRes, approvedRes, pendingMedRes, approvedMedRes] = await Promise.allSettled([
        apiClient.get('/tasks', { params: { status: 'Pending Review' } }),
        apiClient.get('/tasks', { params: { status: 'Approved' } }),
        medicineLogService.getPendingMedicineLogs(),
        medicineLogService.getMedicineLogs({ status: 'approved' })
      ]);

      setPendingTasks(pendingRes.status === 'fulfilled' ? pendingRes.value.data.data || [] : []);
      setApprovedTasks(approvedRes.status === 'fulfilled' ? approvedRes.value.data.data || [] : []);
      setPendingMedicineLogs(pendingMedRes.status === 'fulfilled' ? pendingMedRes.value.data || [] : []);
      setApprovedMedicineLogs(approvedMedRes.status === 'fulfilled' ? approvedMedRes.value.data || [] : []);
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
    ...pendingTasks.map(t => ({ ...t, itemType: 'task', status: 'Pending Review' })),
    ...pendingMedicineLogs.map(m => ({ ...m, itemType: 'medicine', status: 'Pending Review' }))
  ].sort((a, b) => new Date(b.createdAt || b.timeAdministered) - new Date(a.createdAt || a.timeAdministered));

  const approvedItems = [
    ...approvedTasks.map(t => ({ ...t, itemType: 'task', status: 'Approved' })),
    ...approvedMedicineLogs.map(m => ({ ...m, itemType: 'medicine', status: 'Approved' }))
  ].sort((a, b) => new Date(b.createdAt || b.timeAdministered) - new Date(a.createdAt || a.timeAdministered));

  const allItems = [...pendingItems, ...approvedItems];
  const filtered = allItems.filter(item => {
    const status = item.status === 'Pending Review' ? 'Pending' : item.status;
    if (activeFilter !== 'All' && status !== activeFilter) return false;
    const searchTerm = search.toLowerCase();
    const itemName = item.itemType === 'task' ? item.name : item.medicineName;
    const createdBy = item.itemType === 'task' ? item.createdBy?.fullName : item.jamedar?.fullName;
    return itemName?.toLowerCase().includes(searchTerm) || createdBy?.toLowerCase().includes(searchTerm);
  });

  const pendingCount = pendingItems.length;
  const approvedCount = approvedItems.length;
  const totalItems = allItems.length;

  const getStatusClass = (status) => {
    if (status === 'Pending Review') return 'pending';
    if (status === 'Approved') return 'approved';
    if (status === 'Rejected') return 'rejected';
    return '';
  };

  const renderItemCard = (item) => {
    const isTask = item.itemType === 'task';
    const isPending = item.status === 'Pending Review';
    const itemName = isTask ? item.name : item.medicineName;
    const createdBy = isTask ? item.createdBy?.fullName : item.jamedar?.fullName;
    const timestamp = isTask ? item.scheduledTime : item.timeAdministered;

    return (
      <div key={item.id} className="approval-card">
        <div className="card-header">
          <span className={`status-badge ${getStatusClass(item.status)}`}>
            {item.status === 'Pending Review' ? 'Pending' : item.status}
          </span>
          <span className="card-date card-id">ID: {item.id.toString().toUpperCase().slice(0, 8)}</span>
        </div>
        <h3>{itemName}</h3>
        <p className="card-subtitle">{createdBy || 'Unknown'}</p>

        <div className="card-content">
          {isTask ? (
            <>
              <p><strong>Horse:</strong> {item.horse?.name || 'N/A'}</p>
              <p><strong>Priority:</strong> {item.priority}</p>
              {item.description && <p>{item.description}</p>}
            </>
          ) : (
            <>
              <p><strong>Quantity:</strong> {item.quantity} {item.unit}</p>
              {item.notes && <p>{item.notes}</p>}
            </>
          )}
        </div>

        <div className="card-footer">
          <span className="card-date card-timestamp">
            <Clock size={14} /> {new Date(timestamp).toLocaleString('en-IN')}
          </span>
          {isPending && (
            <div className="card-actions-right">
              <button
                onClick={() => handleApproveItem(item.id, item.itemType)}
                disabled={loading}
                className="btn-approve"
              >
                <CheckCircle2 size={14} /> {t('Approve')}
              </button>
              <button
                onClick={() => handleRejectItem(item.id, item.itemType)}
                disabled={loading}
                className="btn-reject"
              >
                <XCircle size={14} /> {t('Reject')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!p.viewApprovals) return <Navigate to="/" replace />;

  return (
    <div className="approvals-page">
      {/* Header */}
      <div className="approval-header">
        <div>
          <h1>{t('Task & Medicine Approvals')}</h1>
          <p className="label-overline">
            {t('Review and approve tasks and medicine logs')}
          </p>
        </div>
        <div className="stat-card pending-queue-badge">
          <div className="pending-queue-count">
            {pendingCount}
          </div>
          <div>
            <span className="label-overline">{t('Awaiting Review')}</span>
            <p className="pending-queue-label">{t('Pending Queue')}</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Filters + Search */}
      <div className="task-filters">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={activeFilter === f ? 'btn-primary' : 'btn-secondary'}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder={t('Filter by name or person...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Main Grid */}
      <div className="approvals-layout">
        {/* Approval Cards */}
        <div className="approval-grid">
          {filtered.length === 0 && <div className="no-data">{t('No approvals found')}</div>}
          {filtered.map(item => renderItemCard(item))}
        </div>

        {/* Sidebar */}
        <div className="approvals-sidebar">
          <div className="card">
            <div className="card-header">
              <h3 className="sidebar-card-title">
                <BarChart3 size={18} /> {t('Approval Stats')}
              </h3>
            </div>
            <div className="card-content">
              <div className="stat-row">
                <span className="label-overline">{t('Approved Rate')}</span>
                <span className="stat-value stat-value-success">{totalItems > 0 ? Math.round((approvedCount / totalItems) * 100) : 0}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill progress-bar-success" style={{ width: `${totalItems > 0 ? (approvedCount / totalItems) * 100 : 0}%` }} />
              </div>
              <div className="stat-row" style={{ marginTop: 16 }}>
                <span className="label-overline">{t('Pending')}</span>
                <span className="stat-value stat-value-warning">{pendingCount}</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill progress-bar-warning" style={{ width: `${totalItems > 0 ? (pendingCount / totalItems) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="sidebar-card-title">
                <Shield size={18} /> {t('Compliance')}
              </h3>
            </div>
            <div className="card-content">
              <p className="compliance-text">
                {t('All approvals are logged for audit compliance. Pending items require action within 48 hours.')}
              </p>
              <p className="compliance-sla">
                {t('SLA: 24h response target')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTasksPage;
