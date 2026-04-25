import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Plus, X, LogIn, LogOut, Users, UserCheck, Car, Pencil } from 'lucide-react';
import DatePicker from '../components/shared/DatePicker';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';
import { writeRowsToXlsx } from '../lib/xlsxExport';
import useModalFeedbackToast, { shouldSuppressInlineModalFeedback } from '../hooks/useModalFeedbackToast';

const GateEntryRegisterPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [entries, setEntries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [visitorsList, setVisitorsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('entry');
  const [formData, setFormData] = useState({ personType: 'Staff', employeeId: '', visitorId: '', newVisitorName: '', newVisitorPurpose: '', newVisitorPhone: '', vehicleNo: '', notes: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [editingEntry, setEditingEntry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const suppressInlineError = shouldSuppressInlineModalFeedback({ open: showForm, error });

  useModalFeedbackToast({ open: showForm, error });

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const entriesResponse = await apiClient.get('/gate-entry/register', { params: { date: selectedDate } });
      setEntries(entriesResponse.data.entries || []);
      const staffResponse = await apiClient.get('/employees');
      setStaffList(staffResponse.data.data || []);
      const visitorsResponse = await apiClient.get('/visitors');
      setVisitorsList(visitorsResponse.data.visitors || []);
    } catch (err) { setError(err.response?.data?.error || 'Failed to load data'); }
    finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { loadData(); setCurrentPage(1); }, [loadData]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'newVisitorPhone') { setFormData(prev => ({ ...prev, [name]: value.replace(/[^\d]/g, '') })); return; }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePersonTypeChange = (type) => {
    setFormData(prev => ({ ...prev, personType: type, employeeId: '', visitorId: '', newVisitorName: '', newVisitorPurpose: '', newVisitorPhone: '' }));
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormMode('entry');
    setFormData({
      personType: entry.personType === 'staff' ? 'Staff' : entry.personType,
      employeeId: entry.employeeId || '',
      visitorId: entry.visitor?.id || '',
      newVisitorName: entry.personName || '',
      newVisitorPurpose: entry.visitor?.purpose || '',
      newVisitorPhone: entry.visitor?.contactNumber || '',
      vehicleNo: entry.vehicleNo || '',
      notes: entry.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccessMessage('');
    if (formData.personType === 'Staff' && !formData.employeeId) { setError('Please select a staff member'); return; }
    if (formData.personType === 'Visitor' && !formData.visitorId && !formData.newVisitorName) { setError('Please select or provide visitor details'); return; }
    try {
      if (editingEntry) {
        await apiClient.put(`/gate-entry/${editingEntry.id}`, { vehicleNo: formData.vehicleNo || null, notes: formData.notes || null });
        setSuccessMessage('Entry updated successfully');
      } else {
        const endpoint = formMode === 'entry' ? '/gate-entry/entry' : '/gate-entry/exit';
        await apiClient.post(endpoint, { personType: formData.personType, employeeId: formData.employeeId || null, visitorId: formData.visitorId || null, newVisitorName: formData.newVisitorName || null, newVisitorPurpose: formData.newVisitorPurpose || null, newVisitorPhone: formData.newVisitorPhone || null, vehicleNo: formData.vehicleNo || null, notes: formData.notes });
        setSuccessMessage(`${formMode === 'entry' ? 'Entry' : 'Exit'} recorded successfully`);
      }
      setFormData({ personType: 'Staff', employeeId: '', visitorId: '', newVisitorName: '', newVisitorPurpose: '', newVisitorPhone: '', vehicleNo: '', notes: '' });
      setEditingEntry(null);
      setShowForm(false);
      setTimeout(() => { loadData(); setSuccessMessage(''); }, 1500);
    } catch (err) { setError(err.response?.data?.error || (editingEntry ? 'Failed to update entry' : `Failed to record ${formMode}`)); }
  };

  const handleExit = (entryId) => setConfirmModal({ isOpen: true, id: entryId });
  const confirmExit = async () => {
    const entryId = confirmModal.id; setConfirmModal({ isOpen: false, id: null });
    try {
      await apiClient.post(`/gate-entry/${entryId}/exit`);
      setSuccessMessage('Exit recorded successfully');
      setTimeout(() => { loadData(); setSuccessMessage(''); }, 1500);
    } catch (err) { setError(err.response?.data?.error || 'Failed to record exit'); }
  };

  const getStaffName = (staffId) => { const s = staffList.find(s => s.id === staffId); return s ? s.fullName : 'Unknown'; };
  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString() : '-';
  const getTotalDuration = (entry, exit) => {
    if (!entry || !exit) return '-';
    const diff = Math.floor((new Date(exit) - new Date(entry)) / 60000);
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const getExportRows = () => entries.map(entry => ({ 'Name': entry.personType === 'staff' ? getStaffName(entry.employeeId) : (entry.visitor?.name || entry.personName || ''), 'Type': entry.personType, 'Vehicle': entry.vehicleNo || '', 'Entry': formatTime(entry.entryTime), 'Exit': formatTime(entry.exitTime), 'Duration': getTotalDuration(entry.entryTime, entry.exitTime), 'Purpose/Notes': entry.visitor?.purpose || entry.notes || '' }));

  const handleDownloadExcel = async () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data'); return; }
    await writeRowsToXlsx(data, {
      sheetName: 'Gate Register',
      fileName: `GateRegister_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  const handleDownloadCSV = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data'); return; }
    downloadCsvFile(data, `GateRegister_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const inputCls = "w-full h-10 px-4 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none";
  const activeIn = entries.filter(e => !e.exitTime).length;
  const totalExited = entries.filter(e => e.exitTime).length;
  const totalPages = Math.ceil(entries.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEntries = entries.slice(startIndex, startIndex + rowsPerPage);

  if (!p.viewGateEntry) return <Navigate to="/dashboard" replace />;

  return (
    <div className="gate-entry-page space-y-6">
      {/* Header */}
      <div className="gate-entry-page-header flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="gate-entry-title-block">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Gate Entry/Exit')} <span className="text-primary">{t("Register")}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Recorded by Guard: {user?.fullName || 'Guard'}</p>
        </div>
      </div>

      {successMessage && <div className="px-4 py-3 rounded-lg text-sm font-medium bg-success/15 text-success border border-success/30">✓ {successMessage}</div>}
      {error && !suppressInlineError && <div className="px-4 py-3 rounded-lg text-sm font-medium bg-destructive/15 text-destructive border border-destructive/30">✕ {error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        {[
          { label: 'TOTAL ENTRIES', value: entries.length, icon: Users, sub: 'All register movements' },
          { label: 'CURRENTLY INSIDE', value: activeIn, icon: LogIn, sub: 'Open entry sessions' },
          { label: 'EXITED', value: totalExited, icon: LogOut, sub: 'Completed movements' },
          { label: 'VEHICLES', value: entries.filter(e => e.vehicleNo).length, icon: Car, sub: 'Vehicle-linked entries' },
        ].map(k => (
          <OperationalMetricCard key={k.label} label={k.label} value={String(k.value).padStart(2, '0')} icon={k.icon} colorClass="text-primary" bgClass="bg-primary/10" sub={k.sub} hideSub />
        ))}
      </div>

      {/* Entry/Exit Section */}
      <div className="gate-entry-header-row flex flex-col md:flex-row items-stretch md:items-end gap-4">
        <button onClick={() => { setShowForm(!showForm); setEditingEntry(null); setFormData({ personType: 'Staff', employeeId: '', visitorId: '', newVisitorName: '', newVisitorPurpose: '', newVisitorPhone: '', vehicleNo: '', notes: '' }); }} className={`gate-entry-header-btn h-10 px-5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${showForm ? 'bg-primary text-primary-foreground border border-primary/45 shadow-[0_0_0_1px_rgba(168,85,247,0.24)]' : 'bg-primary text-primary-foreground hover:brightness-110'}`}>
          {showForm ? <><X className="w-4 h-4" /> {t("Cancel")}</> : <><Plus className="w-4 h-4" /> Record Entry/Exit</>}
        </button>
        <div className="gate-entry-date-wrap flex items-end gap-3 md:ml-auto">
          <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} />
        </div>
      </div>

      {/* Form */}
      {showForm && ReactDOM.createPortal(
        <div className="efm-page-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto px-4 pb-4 pt-[72px] sm:p-6 bg-background/80" onClick={() => { setShowForm(false); setEditingEntry(null); }}>
          <div className="my-auto bg-surface-container-highest rounded-xl border border-border w-full max-w-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-5.5rem)] sm:max-h-[90vh] edge-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                {editingEntry && <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25"><Pencil className="w-3 h-3" /> Editing</span>}
                <h3 className="text-xl font-bold text-foreground">{editingEntry ? t("Edit Gate Entry") : t("Record Gate Entry")}</h3>
              </div>
              <button type="button" onClick={() => { setShowForm(false); setEditingEntry(null); }} className="p-1 rounded-lg hover:bg-surface-container-high transition-colors text-muted-foreground mr-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">Operation:</label>
              <div className="gate-entry-toggle-group flex gap-2">
                {['entry', 'exit'].map(m => (
                  <button key={m} type="button" onClick={() => setFormMode(m)} className={`gate-entry-toggle-btn px-4 py-2 rounded-lg text-sm font-medium transition-all ${formMode === m ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground border border-transparent hover:bg-surface-container-highest'}`}>{m === 'entry' ? 'Entry' : 'Exit'}</button>
                ))}
              </div>
            </div>
            {/* Person Type */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">Person
                Type:</label>
              <div className="gate-entry-toggle-group flex gap-2">
                {['Staff', 'Visitor'].map(pt => (
                  <button key={pt} type="button" onClick={() => handlePersonTypeChange(pt)} className={`gate-entry-toggle-btn px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${formData.personType === pt ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground border border-transparent hover:bg-surface-container-highest'}`}>
                    {pt === 'Staff' ? <UserCheck className="w-4 h-4" /> : <Users className="w-4 h-4" />} {pt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.personType === 'Staff' && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Select Staff *")}</label>
                  <SearchableSelect name="employeeId" value={formData.employeeId} onChange={handleFormChange} placeholder="-- Choose Staff --" required options={[{ value: '', label: '-- Choose Staff --' }, ...staffList.map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))]} />
                </div>
              )}
              {formData.personType === 'Visitor' && (
                <>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Existing Visitor")}</label>
                    <SearchableSelect name="visitorId" value={formData.visitorId} onChange={handleFormChange} placeholder="-- Select Visitor --" options={[{ value: '', label: '-- Select Visitor --' }, ...visitorsList.map(v => ({ value: v.id, label: `${v.name} (${v.purpose})` }))]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Or New Visitor Name *")}</label>
                    <input type="text" name="newVisitorName" value={formData.newVisitorName} onChange={handleFormChange} placeholder="Full name" maxLength="50" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Phone")}</label>
                    <input type="text" name="newVisitorPhone" value={formData.newVisitorPhone} onChange={handleFormChange} placeholder="Phone" inputMode="numeric" maxLength="15" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Purpose *")}</label>
                    <input type="text" name="newVisitorPurpose" value={formData.newVisitorPurpose} onChange={handleFormChange} placeholder="e.g., Delivery, Meeting" maxLength="100" className={inputCls} />
                  </div>
                </>
              )}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Vehicle No.")}</label>
                <input type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleFormChange} placeholder="Registration" maxLength="15" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Notes")}</label>
                <input type="text" name="notes" value={formData.notes} onChange={handleFormChange} placeholder={t("Additional notes")} maxLength="250" className={inputCls} />
              </div>
            </div>
          </form>
            </div>
            <div className="p-4 sm:p-6 border-t border-border flex justify-end gap-3 bg-surface-container-high/50 shrink-0">
              <button type="button" onClick={() => { setShowForm(false); setEditingEntry(null); }} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-highest transition-colors">{t("Cancel")}</button>
              <button type="button" onClick={handleSubmit} className={`gate-entry-submit-btn h-10 px-6 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${editingEntry ? 'bg-primary text-primary-foreground hover:brightness-110' : formMode === 'entry' ? 'bg-success text-success-foreground hover:brightness-110' : 'bg-warning text-warning-foreground hover:brightness-110'}`}>{editingEntry ? <><Pencil className="w-4 h-4" /> Save Changes</> : `Record ${formMode === 'entry' ? 'Entry' : 'Exit'}`}</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Register Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Gate Register — {new Date(selectedDate).toLocaleDateString('en-GB')}</h3>
          <ExportDialog
            title={t("Export Gate Register")}
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button className="gate-entry-export h-9 w-9 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center" type="button" aria-label={t("Export gate register")} title={t("Export gate register")}>
                <Download className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          />
        </div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading gate entries...</div>
        ) : entries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Name', 'Type', 'Vehicle', 'Entry', 'Exit', 'Duration', 'Purpose/Notes', 'Action'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map((entry) => (
                    <tr key={entry.id} className={`border-b border-border/50 hover:bg-surface-container-high transition-colors ${!entry.exitTime ? 'bg-success/5' : ''}`}>
                      <td className="px-3 py-3 font-medium text-foreground">{entry.personType === 'Staff' ? getStaffName(entry.employeeId) : entry.visitor?.name || 'Visitor'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${entry.personType === 'Staff' ? 'border-primary/30 text-primary bg-primary/10' : 'border-secondary/30 text-secondary bg-secondary/10'}`}>{entry.personType}</span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground mono-data">{entry.vehicleNo || '-'}</td>
                      <td className="px-3 py-3 text-muted-foreground mono-data whitespace-nowrap">{formatTime(entry.entryTime)}</td>
                      <td className="px-3 py-3 mono-data whitespace-nowrap">{entry.exitTime ? <span className="text-muted-foreground">{formatTime(entry.exitTime)}</span> : <span className="text-success text-xs font-semibold">{t("Inside")}</span>}</td>
                      <td className="px-3 py-3 text-muted-foreground mono-data">{getTotalDuration(entry.entryTime, entry.exitTime)}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{entry.personType === 'Visitor' && entry.visitor ? entry.visitor.purpose : entry.notes || '-'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {!entry.exitTime ? (
                            <button onClick={() => handleExit(entry.id)} className="h-7 px-3 rounded text-[10px] font-semibold bg-warning/15 border border-warning/30 text-warning hover:bg-warning/25 transition-colors">{t("Mark Exit")}</button>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">{t("Exited")}</span>
                          )}
                          <button
                            onClick={() => handleEdit(entry)}
                            className="h-7 px-3 rounded text-[10px] font-semibold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
                            title={t("Edit entry")}
                          >
                            <Pencil className="w-3 h-3" />
                            {t("Edit")}
                          </button>
                        </div>
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
              total={entries.length}
            />
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No gate entries for {new Date(selectedDate).toLocaleDateString()}</div>
        )}
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmExit} onCancel={() => setConfirmModal({ isOpen: false, id: null })} title="Confirm Exit" message={t("Are you sure you want to mark this entry as exited?")} confirmText={t("Confirm")} confirmVariant="primary" />
    </div>
  );
};

export default GateEntryRegisterPage;
