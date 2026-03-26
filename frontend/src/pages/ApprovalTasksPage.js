import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, BarChart3, Shield, SlidersHorizontal } from 'lucide-react';
import apiClient from '../services/apiClient';
import medicineLogService from '../services/medicineLogService';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const statusStyles = {
  Pending: 'bg-warning/10 text-warning border-warning/30',
  Approved: 'bg-success/10 text-success border-success/30',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

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

  const getStatusStyle = (status) => {
    if (status === 'Pending Review') return statusStyles.Pending;
    if (status === 'Approved') return statusStyles.Approved;
    if (status === 'Rejected') return statusStyles.Rejected;
    return '';
  };

  const renderItemCard = (item) => {
    const isTask = item.itemType === 'task';
    const isPending = item.status === 'Pending Review';
    const itemName = isTask ? item.name : item.medicineName;
    const createdBy = isTask ? item.createdBy?.fullName : item.jamedar?.fullName;
    const timestamp = isTask ? item.scheduledTime : item.timeAdministered;
    const displayStatus = item.status === 'Pending Review' ? 'Pending' : item.status;

    return (
      <div key={item.id} className="bg-surface-container-high rounded-xl p-5 md:p-6 edge-glow border border-primary/10 hover:border-primary/30 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
            {displayStatus}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono opacity-60">ID: {item.id.toString().toUpperCase().slice(0, 8)}</span>
        </div>
        <h3 className="text-xl font-bold text-foreground leading-tight">{itemName}</h3>
        <p className="text-sm text-primary/90 mt-1 font-medium">{createdBy || 'Unknown'}</p>

        <div className="text-sm text-muted-foreground mt-3 leading-relaxed space-y-1">
          {isTask ? (
            <>
              <p><span className="text-foreground font-medium">Horse:</span> {item.horse?.name || 'N/A'}</p>
              <p><span className="text-foreground font-medium">Priority:</span> {item.priority}</p>
              {item.description && <p>{item.description}</p>}
            </>
          ) : (
            <>
              <p><span className="text-foreground font-medium">Quantity:</span> {item.quantity} {item.unit}</p>
              {item.notes && <p>{item.notes}</p>}
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-border/10">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <Clock className="w-3.5 h-3.5" /> {new Date(timestamp).toLocaleString('en-IN')}
          </span>
          {isPending && (
            <div className="flex gap-2">
              <button
                onClick={() => handleApproveItem(item.id, item.itemType)}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-success/15 text-success text-sm font-semibold hover:bg-success/25 border border-success/20 transition-all active:scale-95 shadow-lg shadow-black/5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> {t('Approve')}
              </button>
              <button
                onClick={() => handleRejectItem(item.id, item.itemType)}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-destructive/15 text-destructive text-sm font-semibold hover:bg-destructive/25 border border-destructive/20 transition-all active:scale-95 shadow-lg shadow-black/5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> {t('Reject')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!p.viewApprovals) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('Task & Medicine Approvals')}</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {t('Review and approve tasks and medicine logs')}
          </p>
        </div>
        <div className="w-full lg:w-auto bg-surface-container-highest rounded-xl p-4 edge-glow flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-warning flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-warning">{pendingCount}</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t('Awaiting Review')}</p>
            <p className="text-lg font-bold text-foreground">{t('Pending Queue')}</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${message.includes('✗') ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-success/10 text-success border border-success/20'}`}>
          {message}
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                activeFilter === f
                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_-3px_rgba(var(--primary-rgb),0.2)]'
                  : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder={t('Filter by name or person...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full px-4 pr-10 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
          <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Approval Cards */}
        <div className="space-y-4">
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">{t('No approvals found')}</div>}
          {filtered.map(item => renderItemCard(item))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">{t('Approval Stats')}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('Approved Rate')}</span>
                <span className="text-sm font-bold text-success">{totalItems > 0 ? Math.round((approvedCount / totalItems) * 100) : 0}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-surface-container-high">
                <div className="h-1 rounded-full bg-success transition-all" style={{ width: `${totalItems > 0 ? (approvedCount / totalItems) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t('Pending')}</span>
                <span className="text-sm font-bold text-warning">{pendingCount}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-surface-container-high">
                <div className="h-1 rounded-full bg-warning transition-all" style={{ width: `${totalItems > 0 ? (pendingCount / totalItems) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">{t('Compliance')}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('All approvals are logged for audit compliance. Pending items require action within 48 hours.')}
            </p>
            <p className="mt-3 text-xs text-primary font-semibold">
              {t('SLA: 24h response target')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTasksPage;
