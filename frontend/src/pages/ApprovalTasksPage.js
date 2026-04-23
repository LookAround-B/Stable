import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, X, XCircle, Clock, BarChart3, Search, Shield } from 'lucide-react';
import apiClient from '../services/apiClient';
import medicineLogService from '../services/medicineLogService';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const statusStyles = {
  Pending: 'bg-warning/10 text-warning border-warning/30',
  Approved: 'bg-success/10 text-success border-success/30',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const getEvidenceSrc = (item) => {
  const image = item?.proofImage || item?.photoUrl || '';
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('data:')) return image;
  const apiRoot = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
  return `${apiRoot}${image}`;
};

const ApprovalTasksPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [approvedTasks, setApprovedTasks] = useState([]);
  const [rejectedTasks, setRejectedTasks] = useState([]);
  const [pendingMedicineLogs, setPendingMedicineLogs] = useState([]);
  const [approvedMedicineLogs, setApprovedMedicineLogs] = useState([]);
  const [rejectedMedicineLogs, setRejectedMedicineLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const filters = ['All', 'Pending', 'Approved', 'Rejected'];

  useEffect(() => {
    loadAllTasks();
  }, []);

  useEffect(() => {
    if (!selectedEvidence) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedEvidence(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEvidence]);

  const loadAllTasks = async () => {
    try {
      setLoading(true);
      const [pendingRes, approvedRes, rejectedRes, pendingMedRes, approvedMedRes, rejectedMedRes] = await Promise.allSettled([
        apiClient.get('/tasks', { params: { status: 'Pending Review' } }),
        apiClient.get('/tasks', { params: { status: 'Approved' } }),
        apiClient.get('/tasks', { params: { status: 'Rejected' } }),
        medicineLogService.getPendingMedicineLogs(),
        medicineLogService.getMedicineLogs({ status: 'approved' }),
        medicineLogService.getMedicineLogs({ status: 'rejected' })
      ]);

      setPendingTasks(pendingRes.status === 'fulfilled' ? pendingRes.value.data.data || [] : []);
      setApprovedTasks(approvedRes.status === 'fulfilled' ? approvedRes.value.data.data || [] : []);
      setRejectedTasks(rejectedRes.status === 'fulfilled' ? rejectedRes.value.data.data || [] : []);
      setPendingMedicineLogs(pendingMedRes.status === 'fulfilled' ? pendingMedRes.value.data || [] : []);
      setApprovedMedicineLogs(approvedMedRes.status === 'fulfilled' ? approvedMedRes.value.data || [] : []);
      setRejectedMedicineLogs(rejectedMedRes.status === 'fulfilled' ? rejectedMedRes.value.data || [] : []);
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
        const rejectedTask = pendingTasks.find(t => t.id === itemId);
        await apiClient.patch(`/tasks/${itemId}`, { status: 'Rejected' });
        setPendingTasks(pendingTasks.filter(t => t.id !== itemId));
        setRejectedTasks([rejectedTask, ...rejectedTasks]);
      } else {
        const rejectedLog = pendingMedicineLogs.find(m => m.id === itemId);
        await medicineLogService.rejectMedicineLog(itemId, 'Rejected');
        setPendingMedicineLogs(pendingMedicineLogs.filter(m => m.id !== itemId));
        setRejectedMedicineLogs([rejectedLog, ...rejectedMedicineLogs]);
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

  const rejectedItems = [
    ...rejectedTasks.map(t => ({ ...t, itemType: 'task', status: 'Rejected' })),
    ...rejectedMedicineLogs.map(m => ({ ...m, itemType: 'medicine', status: 'Rejected' }))
  ].sort((a, b) => new Date(b.createdAt || b.timeAdministered) - new Date(a.createdAt || a.timeAdministered));

  const allItems = [...pendingItems, ...approvedItems, ...rejectedItems];
  const filtered = allItems.filter(item => {
    const status = item.status === 'Pending Review' ? 'Pending' : item.status;
    if (activeFilter !== 'All' && status !== activeFilter) return false;
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return true;
    const itemName = item.itemType === 'task' ? item.name : item.medicineName;
    const createdBy = item.itemType === 'task' ? item.createdBy?.fullName : item.jamedar?.fullName;
    const horseName = item.itemType === 'task' ? item.horse?.name : '';
    return (
      itemName?.toLowerCase().includes(searchTerm) ||
      createdBy?.toLowerCase().includes(searchTerm) ||
      horseName?.toLowerCase().includes(searchTerm)
    );
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
    const evidenceSrc = isTask ? getEvidenceSrc(item) : '';
    const horseName = item.horse?.name || 'N/A';

    return (
      <div key={item.id} className="bg-surface-container-high rounded-xl p-5 md:p-6 edge-glow border border-primary/10 hover:border-primary/30 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(item.status)}`}>
            {displayStatus}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono opacity-60">ID: {item.id.toString().toUpperCase().slice(0, 8)}</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-5">
          {isTask && (
            <div className="w-full md:w-28 shrink-0">
              <div className="aspect-square rounded-xl overflow-hidden border border-border bg-surface-container-highest">
                {evidenceSrc ? (
                  <button
                    type="button"
                    onClick={() => setSelectedEvidence({
                      src: evidenceSrc,
                      taskName: itemName,
                      horseName,
                      submittedBy: createdBy || 'Unknown',
                    })}
                    className="group relative h-full w-full cursor-zoom-in"
                    aria-label={`Open evidence for ${itemName}`}
                  >
                    <img
                      src={evidenceSrc}
                      alt="Task evidence"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent px-3 py-2 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/90">
                        Tap to view
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    No Photo
                  </div>
                )}
              </div>
            </div>
          )}

            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold text-foreground leading-tight">{itemName}</h3>
              <p className="text-sm text-primary/90 mt-1 font-medium">{createdBy || 'Unknown'}</p>

              <div className="text-sm text-muted-foreground mt-3 leading-relaxed space-y-1">
              {isTask ? (
                <>
                  <p><span className="text-foreground font-medium">Horse:</span> {horseName}</p>
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
          </div>
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

  if (!p.viewApprovals) return <Navigate to="/dashboard" replace />;

  return (
    <div className="approvals-page space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('Task & Treatment Approvals')}</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {t('Review and approve tasks and treatment logs')}
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
            placeholder={t('Search by name or person...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full pl-10 pr-4 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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

      {selectedEvidence && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-background/92 backdrop-blur-md p-0 sm:p-6"
          onClick={() => setSelectedEvidence(null)}
        >
          <div
            className="relative flex h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border/40 bg-surface-container sm:h-auto sm:max-h-[88vh] sm:max-w-5xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedEvidence(null)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/80 text-foreground shadow-lg transition-colors hover:bg-background sm:right-4 sm:top-4"
              aria-label="Close evidence preview"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-border/20 bg-surface-container-high/80 px-4 py-4 pr-16 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80">Photo Evidence</p>
              <h3 className="mt-1 text-lg font-bold text-foreground sm:text-xl">{selectedEvidence.taskName}</h3>
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-4 sm:text-sm">
                <span><span className="font-medium text-foreground">Horse:</span> {selectedEvidence.horseName}</span>
                <span><span className="font-medium text-foreground">Submitted by:</span> {selectedEvidence.submittedBy}</span>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_top,_rgba(var(--primary-rgb),0.12),_transparent_55%)] p-3 sm:p-6">
              <img
                src={selectedEvidence.src}
                alt={`${selectedEvidence.taskName} evidence`}
                className="max-h-full w-full rounded-2xl border border-border/30 bg-background/50 object-contain shadow-2xl sm:max-w-[calc(100vw-8rem)]"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ApprovalTasksPage;
