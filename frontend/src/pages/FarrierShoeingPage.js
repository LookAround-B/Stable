import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import usePermissions from '../hooks/usePermissions';
import { Download, Bell, BellOff, Send, Plus, X, Trash2, Hammer, Clock, CheckCircle, Search } from 'lucide-react';
import { showNoExportDataToast } from '../lib/exportToast';
import ExportDialog from '../components/shared/ExportDialog';
import { downloadCsvFile } from '../lib/csvExport';
import { writeRowsToXlsx } from '../lib/xlsxExport';
import DateTimePicker from "../components/shared/DateTimePicker";

const SHOEING_INTERVAL_DAYS = 21;

const getLocalDateTimeString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const FarrierShoeingPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const taskCapabilities = user?.taskCapabilities || {};
  const canManageSchedules = p.isAdmin || Boolean(user?.permissions?.manageSchedules);
  const canRecordFarrierShoeing =
    canManageSchedules || Boolean(taskCapabilities.canRecordFarrierShoeing);
  const [activeTab, setActiveTab] = useState('completed');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [records, setRecords] = useState([]);
  const [pendingHorses, setPendingHorses] = useState([]);
  const [horses, setHorses] = useState([]);
  const [farriers, setFarriers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [reminder, setReminder] = useState({ pendingCount: 0, isSnoozed: false, snoozedUntil: null, lastSent: null });
  const [reminderSending, setReminderSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [formData, setFormData] = useState({
    horseId: '', farrierId: '', shoeingDate: getLocalDateTimeString(), shoeChanged: 'Yes', numberOfLegs: '4', notes: '',
  });

  const showMsg = (msg, type = 'success') => { setMessage(msg); setMessageType(type); setTimeout(() => setMessage(''), 5000); };

  const loadRecords = useCallback(async () => {
    try { setLoading(true); const response = await apiClient.get('/farrier-shoeing'); setRecords(response.data.data || []); }
    catch (error) { console.error('Error loading shoeing records:', error); showMsg('Failed to load shoeing records', 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadPendingHorses = useCallback(async () => {
    try { setLoading(true); const response = await apiClient.get('/farrier-shoeing?tab=pending'); setPendingHorses(response.data.data || []); }
    catch (error) { console.error('Error loading pending horses:', error); showMsg('Failed to load pending horses', 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadHorses = useCallback(async () => {
    try { const response = await apiClient.get('/horses'); setHorses(response.data.data || []); }
    catch (error) { console.error('Error loading horses:', error); }
  }, []);

  const loadFarriers = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      const allEmployees = response.data.data || response.data || [];
      const farrierList = allEmployees.filter((e) => e.designation === 'Farrier');
      setFarriers(farrierList.length > 0 ? farrierList : allEmployees);
    } catch (error) { console.error('Error loading farriers:', error); }
  }, []);

  useEffect(() => { loadHorses(); loadFarriers(); loadReminderStatus(); }, [loadHorses, loadFarriers]);
  useEffect(() => { if (activeTab === 'completed') { loadRecords(); } else { loadPendingHorses(); } setCurrentPage(1); }, [activeTab, loadRecords, loadPendingHorses]);

  const calculateNextDue = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + SHOEING_INTERVAL_DAYS);
    return d.toLocaleDateString('en-GB');
  };

  const loadReminderStatus = async () => {
    try { const response = await apiClient.get('/farrier-shoeing/reminders'); setReminder(response.data); }
    catch (error) { console.error('Error loading reminder status:', error); }
  };

  const handleSendReminder = async () => {
    try {
      setReminderSending(true);
      const response = await apiClient.post('/farrier-shoeing/reminders', {});
      if (response.data.sent) { showMsg('Reminder email sent successfully'); } else { showMsg(response.data.message || 'No reminder sent', 'error'); }
      loadReminderStatus();
    } catch (error) { showMsg('Failed to send reminder email', 'error'); } finally { setReminderSending(false); }
  };

  const handleSnooze = async () => {
    try { setReminderSending(true); await apiClient.post('/farrier-shoeing/reminders', { action: 'snooze' }); showMsg('Reminder snoozed for 24 hours'); loadReminderStatus(); }
    catch (error) { showMsg('Failed to snooze reminder', 'error'); } finally { setReminderSending(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.horseId || !formData.farrierId || !formData.shoeingDate) { showMsg('Please fill in all required fields', 'error'); return; }
    
    // Check for duplicate shoeing on same date
    const selectedDate = new Date(formData.shoeingDate).toLocaleDateString('en-GB');
    const isDuplicate = records.some(record => 
      record.horse?.id === formData.horseId && 
      new Date(record.shoeingDate).toLocaleDateString('en-GB') === selectedDate
    );
    
    if (isDuplicate) { showMsg('This horse already has a shoeing record for this date', 'error'); return; }
    
    try {
      setLoading(true);
      await apiClient.post('/farrier-shoeing', { horseId: formData.horseId, farrierId: formData.farrierId, shoeingDate: new Date(formData.shoeingDate).toISOString(), shoeChanged: formData.shoeChanged, numberOfLegs: parseInt(formData.numberOfLegs, 10) || 4, notes: formData.notes || '' });
      showMsg('Shoeing record created successfully');
      setFormData({ horseId: '', farrierId: '', shoeingDate: getLocalDateTimeString(), shoeChanged: 'Yes', numberOfLegs: '4', notes: '' });
      setShowForm(false);
      loadRecords(); loadPendingHorses(); loadReminderStatus();
    } catch (error) { showMsg(error.response?.data?.error || 'Failed to create shoeing record', 'error'); } finally { setLoading(false); }
  };

  const handleDelete = (id) => setConfirmModal({ isOpen: true, id });

  const confirmDelete = async () => {
    const id = confirmModal.id; setConfirmModal({ isOpen: false, id: null });
    try { setLoading(true); await apiClient.delete('/farrier-shoeing', { data: { id } }); showMsg('Record deleted'); loadRecords(); loadPendingHorses(); loadReminderStatus(); }
    catch (error) { showMsg('Failed to delete record', 'error'); } finally { setLoading(false); }
  };

  const handleQuickShoe = (horseId) => {
    setFormData({ horseId, farrierId: '', shoeingDate: getLocalDateTimeString(), shoeChanged: 'Yes', numberOfLegs: '4', notes: '' });
    setShowForm(true); setActiveTab('completed');
  };

  const getCompletedExportRows = () => records.map((r) => ({ 'Horse': r.horse?.name || '', 'Stable #': r.horse?.stableNumber || '', 'Farrier': r.farrier?.fullName || '', 'Shoeing Date': r.shoeingDate ? new Date(r.shoeingDate).toLocaleDateString('en-GB') : '', 'Next Due Date': r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString('en-GB') : '', 'Shoe Changed': r.shoeChanged ? 'Yes' : 'No', 'No. of Legs': r.numberOfLegs || 4, 'Notes': r.notes || '' }));

  const getPendingExportRows = () => pendingHorses.map((ph) => ({ 'Horse': ph.horse?.name || '', 'Stable #': ph.horse?.stableNumber || '', 'Last Shoeing': ph.lastShoeingDate ? new Date(ph.lastShoeingDate).toLocaleDateString('en-GB') : 'Never', 'Next Due': ph.nextDueDate ? new Date(ph.nextDueDate).toLocaleDateString('en-GB') : 'N/A', 'Days Overdue': ph.neverShoed ? 'Never Shoed' : (ph.daysOverdue || 0), 'Last Farrier': ph.farrier?.fullName || 'N/A' }));

  const handleDownloadExcel = async () => {
    if (activeTab === 'completed') {
      if (!records.length) { showNoExportDataToast('No data to download'); return; }
      const data = getCompletedExportRows();
      await writeRowsToXlsx(data, {
        sheetName: 'Completed Shoeings',
        fileName: `FarrierShoeing_Completed_${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
    } else {
      if (!pendingHorses.length) { showNoExportDataToast('No data to download'); return; }
      const data = getPendingExportRows();
      await writeRowsToXlsx(data, {
        sheetName: 'Pending Shoeings',
        fileName: `FarrierShoeing_Pending_${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
    }
  };

  const handleDownloadCSV = () => {
    if (activeTab === 'completed') {
      if (!records.length) { showNoExportDataToast('No data to download'); return; }
      downloadCsvFile(getCompletedExportRows(), `FarrierShoeing_Completed_${new Date().toISOString().slice(0, 10)}.csv`);
      return;
    }

    if (!pendingHorses.length) { showNoExportDataToast('No data to download'); return; }
    downloadCsvFile(getPendingExportRows(), `FarrierShoeing_Pending_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!user) return null;
  if (!p.viewFarrierShoeing) return <Navigate to="/dashboard" replace />;

  const totalPages = Math.ceil((activeTab === 'completed' ? records.length : pendingHorses.length) / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedCompleted = records.slice(startIndex, startIndex + rowsPerPage);
  const paginatedPending = pendingHorses.slice(startIndex, startIndex + rowsPerPage);

  const getStatusBadge = (record) => {
    const now = new Date();
    const nextDue = new Date(record.nextDueDate);
    const daysUntilDue = Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) return <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-destructive/30 text-destructive bg-destructive/10">Overdue ({Math.abs(daysUntilDue)}d)</span>;
    if (daysUntilDue <= 5) return <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-warning/30 text-warning bg-warning/10">Due Soon ({daysUntilDue}d)</span>;
    return <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-success/30 text-success bg-success/10">OK ({daysUntilDue}d left)</span>;
  };

  return (
    <div className="farrier-shoeing-page space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Farrier <span className="text-primary">{t("Shoeing")}</span></h1>
        <p className="text-sm text-muted-foreground mt-1">Manage horse shoeing schedule every {SHOEING_INTERVAL_DAYS} days</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === 'error' ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {message}
        </div>
      )}

      {/* Reminder Banner */}
      {reminder.pendingCount > 0 && (
        <div className={`rounded-xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${reminder.isSnoozed ? 'bg-warning/10 border-warning/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-start gap-3">
            <Bell className={`w-5 h-5 shrink-0 mt-0.5 ${reminder.isSnoozed ? 'text-warning' : 'text-destructive'}`} />
            <div>
              <p className="text-sm font-bold text-foreground">
                {reminder.isSnoozed ? 'Reminder Snoozed' : `${reminder.pendingCount} horse${reminder.pendingCount !== 1 ? 's' : ''} pending shoeing`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reminder.isSnoozed ? `Snoozed until ${new Date(reminder.snoozedUntil).toLocaleString('en-GB')}` : 'You have pending horse shoeing tasks. Please complete them.'}
              </p>
              {reminder.lastSent && <p className="text-[10px] text-muted-foreground/60 mt-0.5">Last reminder sent: {new Date(reminder.lastSent).toLocaleString('en-GB')}</p>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleSendReminder} disabled={reminderSending || reminder.isSnoozed} className="h-9 px-4 rounded-lg bg-destructive text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><Send className="w-3.5 h-3.5" />{reminderSending ? 'Sending...' : 'Send Reminder'}</button>
            <button onClick={handleSnooze} disabled={reminderSending || reminder.isSnoozed} className="h-9 px-4 rounded-lg border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><BellOff className="w-3.5 h-3.5" />Snooze 24h</button>
          </div>
        </div>
      )}

      {/* Tab Pills */}
      <div className="farrier-shoeing-tab-stack">
        <div className="farrier-shoeing-tab-grid">
        <button onClick={() => setActiveTab('completed')} className={`farrier-shoeing-tab-btn px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'completed' ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
          <CheckCircle className="w-4 h-4" /> Completed Shoeings
        </button>
        <button onClick={() => setActiveTab('pending')} className={`farrier-shoeing-tab-btn px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
          <Clock className="w-4 h-4" /> Pending / Overdue
          {pendingHorses.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive text-white text-[10px] font-bold">{pendingHorses.length}</span>}
        </button>
        </div>
        {activeTab === 'completed' && canRecordFarrierShoeing && (
          <button onClick={() => setShowForm(!showForm)} disabled={loading} className="farrier-shoeing-record-btn h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
            {showForm ? <><X className="w-4 h-4" /> {t("Cancel")}</> : <><Plus className="w-4 h-4" /> Record Shoeing</>}
          </button>
        )}
      </div>

      {/* Add Form */}
      {canRecordFarrierShoeing && showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 sm:p-6" onClick={() => setShowForm(false)}>
          <div className="my-auto flex w-full max-w-5xl flex-col overflow-visible rounded-2xl border border-border bg-surface-container-highest edge-glow xl:max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
              <h3 className="text-xl font-bold text-foreground">{t("New Shoeing Record")}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:px-5 sm:py-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Horse *")}</label>
                    <SearchableSelect value={formData.horseId} onChange={(e) => setFormData((prev) => ({ ...prev, horseId: e.target.value }))} placeholder={t("Search horse...")} options={[{ value: '', label: 'Select Horse' }, ...horses.map((h) => ({ value: h.id, label: `${h.name}${h.stableNumber ? ` (${h.stableNumber})` : ''}` }))]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Farrier *")}</label>
                    <SearchableSelect value={formData.farrierId} onChange={(e) => setFormData((prev) => ({ ...prev, farrierId: e.target.value }))} placeholder={t("Search farrier...")} options={[{ value: '', label: 'Select Farrier' }, ...farriers.map((f) => ({ value: f.id, label: `${f.fullName} (${f.designation})` }))]} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Shoeing Date & Time *")}</label>
                    <DateTimePicker value={formData.shoeingDate} onChange={(val) => setFormData((prev) => ({ ...prev, shoeingDate: val }))} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Next Due (auto)")}</label>
                    <input type="text" value={calculateNextDue(formData.shoeingDate)} disabled className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-muted-foreground text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Shoe Changed *")}</label>
                    <SearchableSelect value={formData.shoeChanged} onChange={(e) => setFormData((prev) => ({ ...prev, shoeChanged: e.target.value }))} options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]} searchable={false} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("No. of Legs *")}</label>
                    <input type="number" min="1" max="4" value={formData.numberOfLegs} onChange={(e) => setFormData((prev) => ({ ...prev, numberOfLegs: e.target.value }))} required className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Notes")}</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Any notes about the shoeing..." rows="2" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="btn-save-primary">{loading ? 'Saving...' : 'Save Shoeing Record'}</button>
                  <button type="button" onClick={() => setShowForm(false)} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <>
          <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
            <div className="farrier-shoeing-toolbar flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-3">
              <div className="farrier-shoeing-search-wrap relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  placeholder={t("Search horses or farrier...")}
                  className="h-10 pl-9 pr-8 w-full rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="farrier-shoeing-toolbar-actions flex items-center gap-2 shrink-0">
                <ExportDialog
                  title={t("Export Farrier Shoeing")}
                  options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
                  trigger={(
                    <button className="btn-download farrier-shoeing-export h-10 w-11 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center" type="button" aria-label={t("Export farrier shoeing")} title={t("Export farrier shoeing")}>
                      <Download className="w-5 h-5 shrink-0" />
                    </button>
                  )}
                />
                <span className="text-xs text-muted-foreground mono-data hidden sm:block">{records.length} records</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Horse', 'Stable #', 'Farrier', 'Shoeing Date', 'Next Due', 'Shoe Changed', 'No. of Legs', 'Status', 'Notes', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompleted.map((record) => (
                      <tr key={record.id} className="border-b border-border/50 hover:bg-surface-container-high transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{record.horse?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{record.horse?.stableNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{record.farrier?.fullName || 'Unknown'}</td>
                        <td className="px-4 py-3 text-muted-foreground mono-data">{new Date(record.shoeingDate).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3 text-muted-foreground mono-data">{new Date(record.nextDueDate).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3 text-muted-foreground">{record.shoeChanged ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-muted-foreground mono-data">{record.numberOfLegs || 4}</td>
                        <td className="px-4 py-3">{getStatusBadge(record)}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{record.notes || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {canRecordFarrierShoeing && (
                            <button onClick={() => handleDelete(record.id)} disabled={loading} className="h-8 px-3 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors flex items-center gap-1.5"><Trash2 className="w-3 h-3" /> Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
                total={records.length}
              />
            </div>
          {loading && <TableSkeleton cols={6} rows={5} />}
          {!loading && records.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No shoeing records yet</div>
          )}
        </>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <>
          <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
            <div className="farrier-shoeing-toolbar flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-3">
              <div className="farrier-shoeing-search-wrap relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  placeholder={t("Search horses or farrier...")}
                  className="h-10 pl-9 pr-8 w-full rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="farrier-shoeing-toolbar-actions flex items-center gap-2 shrink-0">
                <ExportDialog
                  title={t("Export Farrier Shoeing")}
                  options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
                  trigger={(
                    <button className="btn-download farrier-shoeing-export h-10 w-11 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center" type="button" aria-label={t("Export farrier shoeing")} title={t("Export farrier shoeing")}>
                      <Download className="w-5 h-5 shrink-0" />
                    </button>
                  )}
                />
                <span className="text-xs text-muted-foreground mono-data hidden sm:block">{pendingHorses.length} pending</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Horse', 'Stable #', 'Last Shoeing', 'Next Due', 'Overdue', 'Last Farrier', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPending.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-surface-container-high transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{item.horse?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.horse?.stableNumber || 'N/A'}</td>
                        <td className="px-4 py-3">{item.neverShoed ? <span className="text-destructive font-semibold text-xs">{t("Never Shoed")}</span> : <span className="text-muted-foreground mono-data">{new Date(item.lastShoeingDate).toLocaleDateString('en-GB')}</span>}</td>
                        <td className="px-4 py-3 text-muted-foreground mono-data">{item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-destructive/30 text-destructive bg-destructive/10">
                            {item.neverShoed ? 'Never Shoed' : `${item.daysOverdue} day${item.daysOverdue !== 1 ? 's' : ''} overdue`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.farrier?.fullName || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {canRecordFarrierShoeing && (
                            <button onClick={() => handleQuickShoe(item.horse?.id)} className="h-8 px-4 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1.5"><Hammer className="w-3 h-3" /> Shoe Now</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
                total={pendingHorses.length}
              />
            </div>
          {loading && <TableSkeleton cols={5} rows={5} />}
          {!loading && pendingHorses.length === 0 && (
            <div className="text-center py-12 text-success font-medium">All horses are up to date on shoeing!</div>
          )}
        </>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete} onCancel={() => setConfirmModal({ isOpen: false, id: null })} title="Delete Record" message={t("Are you sure you want to delete this shoeing record?")} confirmText={t("Delete")} confirmVariant="danger" />
    </div>
  );
};

export default FarrierShoeingPage;
