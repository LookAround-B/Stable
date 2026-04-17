import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import medicineLogService from '../services/medicineLogService';
import medicineInventoryService from '../services/medicineInventoryService';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Pill, Activity, CheckCircle, AlertTriangle, SlidersHorizontal, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import DateTimePicker from '../components/shared/DateTimePicker';
import SelectField from '../components/shared/SelectField';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';

const DEFAULT_MEDICINE_NAMES = [
  'Phenylbutazone (Bute)',
  'Banamine (Flunixin)',
  'Adequan (PSGAG)',
  'Legend (Hyaluronate Sodium)',
  'Gastrogard (Omeprazole)',
  'Excede (Ceftiofur)',
  'Eqvalan (Ivermectin Paste)',
  'Panacur (Fenbendazole)',
  'Dexamethasone',
  'Pentosan Equine (Cartrophen)',
  'Regumate (Altrenogest)',
  'Equioxx (Firocoxib)',
  'SMZ-TMP (Sulfamethoxazole)',
  'Vetalog (Triamcinolone)',
  'Osphos (Clodronate)',
];

const MedicineLogsPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const taskCapabilities = user?.taskCapabilities || {};
  const canRecordMedicineLogs = Boolean(taskCapabilities.canRecordMedicineLogs);
  const canApprove = Boolean(taskCapabilities.canApproveMedicineLogs);
  const canViewOwnLogs =
    Boolean(taskCapabilities.canViewOwnMedicineLogs) || canRecordMedicineLogs;
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [logs, setLogs] = useState([]);
  const [horses, setHorses] = useState([]);
  const [medicineNames, setMedicineNames] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all-logs');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    horseId: '',
    medicineName: '',
    quantity: '',
    unit: 'ml',
    timeAdministered: new Date().toISOString().slice(0, 16),
    notes: '',
    photoUrl: '',
  });

  const UNITS = ['ml', 'g', 'tablets', 'vials', 'bottles', 'injections'];

  useEffect(() => {
    if (user) {
      if (canViewOwnLogs) setSelectedTab('my-logs');
      else if (canApprove) setSelectedTab('pending-approval');
      else setSelectedTab('all-logs');
    }
  }, [user?.id, canApprove, canViewOwnLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      if (selectedTab === 'my-logs' && canViewOwnLogs) {
        response = await medicineLogService.getMyMedicineLogs();
      } else if (selectedTab === 'pending-approval' && canApprove) {
        response = await medicineLogService.getPendingMedicineLogs();
      } else {
        response = await medicineLogService.getMedicineLogs();
      }
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
      showMessage('Failed to load medicine logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTab, canApprove, canViewOwnLogs]);

  const loadHorses = useCallback(async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  }, []);

  const loadMedicineNames = useCallback(async () => {
    try {
      const response = await medicineInventoryService.getInventory();
      const records = response.data || [];
      const unique = [...new Set([
        ...records.map(r => r.medicineType),
        ...DEFAULT_MEDICINE_NAMES,
      ])].filter(Boolean).sort();
      setMedicineNames(unique);
    } catch (error) {
      console.error('Error loading medicine names:', error);
      setMedicineNames(DEFAULT_MEDICINE_NAMES);
    }
  }, []);

  useEffect(() => {
    loadHorses();
    loadMedicineNames();
    loadLogs();
  }, [loadHorses, loadMedicineNames, loadLogs]);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          photoUrl: event.target.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (!formData.horseId || !formData.medicineName || !formData.quantity) {
        showMessage('Please fill in all required fields', 'error');
        return;
      }

      const submitData = {
        jamiedarId: user.id,
        horseId: formData.horseId,
        medicineName: formData.medicineName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        timeAdministered: new Date(formData.timeAdministered).toISOString(),
        notes: formData.notes || '',
        photoUrl: formData.photoUrl || '',
      };

      await medicineLogService.createMedicineLog(submitData);
      showMessage('✓ Medicine log created successfully');
      
      setFormData({
        horseId: '',
        medicineName: '',
        quantity: '',
        unit: 'ml',
        timeAdministered: new Date().toISOString().slice(0, 16),
        notes: '',
        photoUrl: '',
      });
      setShowForm(false);
      loadLogs();
    } catch (error) {
      showMessage(error.message || 'Failed to create medicine log', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      setLoading(true);
      await medicineLogService.deleteMedicineLog(id);
      showMessage('Record deleted successfully');
      loadLogs();
    } catch (error) {
      showMessage('Failed to delete record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      await medicineLogService.approveMedicineLog(id, 'Approved by ' + user.fullName);
      showMessage('✓ Medicine log approved');
      loadLogs();
    } catch (error) {
      showMessage('Failed to approve record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      setLoading(true);
      await medicineLogService.rejectMedicineLog(id, reason);
      showMessage('✓ Medicine log rejected');
      loadLogs();
    } catch (error) {
      showMessage('Failed to reject record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const horseMap = horses.reduce((acc, horse) => {
    acc[horse.id] = horse.name;
    return acc;
  }, {});

  if (!user) return null;

  const getExportRows = () => logs.map(l => ({
      'Date': l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB') : '',
      'Horse': l.horse?.name || '',
      'Medicine': l.medicineName,
      'Quantity': l.quantity,
      'Unit': l.unit,
      'Time Administered': l.timeAdministered || '',
      'Status': l.status || '',
      'Submitted By': l.jamedar?.fullName || '',
    }));

  const handleDownloadExcel = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data to download'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Medicine Logs');
    XLSX.writeFile(wb, `MedicineLogs_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleDownloadCSV = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data to download'); return; }
    downloadCsvFile(data, `MedicineLogs_${new Date().toISOString().slice(0,10)}.csv`);
  };

  if (!p.viewMedicineLogs) return <Navigate to="/dashboard" replace />;

  const getStatusBadge = (status) => {
    const cfg = {
      pending: { cls: 'bg-warning/15 text-warning border-warning/30', label: '⏳ Pending' },
      approved: { cls: 'bg-success/15 text-success border-success/30', label: '✔ Approved' },
      rejected: { cls: 'bg-destructive/15 text-destructive border-destructive/30', label: '✕ Rejected' },
    };
    const c = cfg[status] || { cls: 'bg-muted text-muted-foreground border-border', label: status };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${c.cls}`}>
        {c.label}
      </span>
    );
  };

  const totalLogs = logs.length;
  const uniqueMedicines = new Set(logs.map(l => l.medicineName)).size;
  const uniqueHorses = new Set(logs.map(l => l.horse?.name || horseMap[l.horseId]).filter(Boolean)).size;
  const pendingCount = logs.filter(l => l.approvalStatus === 'pending').length;

  const kpis = [
    { label: 'TOTAL ADMINISTRATIONS', value: totalLogs, sub: `↗ ${logs.filter(l => { const d = new Date(l.createdAt); const now = new Date(); return d.toDateString() === now.toDateString(); }).length} today`, subColor: 'text-success', icon: Pill },
    { label: 'UNIQUE MEDICINES', value: uniqueMedicines, sub: 'Active formulary', subColor: 'text-muted-foreground', icon: Activity },
    { label: 'HORSES TREATED', value: uniqueHorses, sub: 'This period', subColor: 'text-muted-foreground', icon: CheckCircle },
    { label: 'PENDING FOLLOW-UPS', value: String(pendingCount).padStart(2, '0'), sub: pendingCount > 0 ? '⚠ Requires attention' : 'All clear', subColor: pendingCount > 0 ? 'text-warning' : 'text-success', icon: AlertTriangle },
  ];

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.horse?.name || horseMap[log.horseId] || '').toLowerCase().includes(term) ||
      (log.medicineName || '').toLowerCase().includes(term) ||
      (log.jamedar?.fullName || '').toLowerCase().includes(term)
    );
  });

  const tabFilters = [
    { key: 'all-logs', label: 'All Logs' },
    ...(canViewOwnLogs ? [{ key: 'my-logs', label: 'My Logs' }] : []),
    ...(canApprove ? [{ key: 'pending-approval', label: 'Pending Approval' }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Medicine <span className="text-primary">{t("Logs")}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Track medicine administration records and treatment history.')}</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <ExportDialog
            title={t("Export Medicine Logs")}
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button className="h-10 w-10 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center" type="button" aria-label={t("Export medicine logs")} title={t("Export medicine logs")}>
                <Download className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          />
        </div>
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === 'success' ? 'bg-success/15 text-success border border-success/30' : 'bg-destructive/15 text-destructive border border-destructive/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        {kpis.map(k => (
          <OperationalMetricCard key={k.label} label={k.label} value={String(k.value)} icon={k.icon} colorClass={k.subColor === 'text-success' ? 'text-success' : k.subColor === 'text-warning' ? 'text-warning' : 'text-primary'} bgClass={k.subColor === 'text-success' ? 'bg-success/10' : k.subColor === 'text-warning' ? 'bg-warning/10' : 'bg-primary/10'} sub={k.sub} subColor={k.subColor} hideSub />
        ))}
      </div>

      {selectedTab === 'all-logs' && !loading && filteredLogs.length > 0 && (
        <div className="medicine-logs-export-row sm:hidden">
          <ExportDialog
            title={t("Export Medicine Logs")}
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button
                className="medicine-logs-export-mobile btn-download"
                aria-label={t("Export medicine logs")}
                title={t("Export medicine logs")}
                type="button"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          />
        </div>
      )}

      {/* ── Tab Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {tabFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setSelectedTab(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTab === f.key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ ALL LOGS TAB ═══════════ */}
      {selectedTab === 'all-logs' && (
        <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="orbit-heading-ignore text-lg font-bold text-foreground">{t('Administration Log')}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-wider hidden sm:inline-block">{t("LiveSync")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t("Search horse or medicine...")}
                  className="h-8 pl-8 pr-3 w-52 rounded-lg bg-surface-container-high text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
              </div>
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-muted-foreground hover:text-foreground'}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile search */}
          {showFilters && (
            <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface-container-high/50 sm:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t("Search horse or medicine...")}
                  className="h-9 pl-8 pr-3 w-full rounded-lg bg-surface-container-high border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
          )}

          {loading && <div className="p-6"><TableSkeleton cols={6} rows={5} /></div>}

          {!loading && filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    {['HORSE', 'MEDICINE', 'QUANTITY', 'TIME', 'SUBMITTED BY', 'STATUS'].map(h => (
                      <th key={h} className="px-4 sm:px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 font-semibold text-sm text-foreground">{log.horse?.name || horseMap[log.horseId] || 'Unknown'}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-foreground">{log.medicineName}</td>
                      <td className="px-4 sm:px-6 py-4 mono-data text-sm text-foreground">{log.quantity} {log.unit}</td>
                      <td className="px-4 sm:px-6 py-4 mono-data text-xs text-foreground">{new Date(log.timeAdministered).toLocaleString()}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-foreground">{log.jamedar?.fullName || 'Unknown'}</td>
                      <td className="px-4 sm:px-6 py-4">{getStatusBadge(log.approvalStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t('No medicine logs found')}</p>
          )}

          {/* Footer count */}
          {!loading && filteredLogs.length > 0 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground mono-data">Displaying {filteredLogs.length} of {logs.length}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MY LOGS TAB ═══════════ */}
      {selectedTab === 'my-logs' && canViewOwnLogs && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              className={`h-10 px-5 rounded-lg text-sm font-medium transition-all ${showForm ? 'border border-border text-foreground hover:bg-surface-container-high' : 'bg-primary text-primary-foreground hover:brightness-110'}`}
              onClick={() => setShowForm(!showForm)}
              disabled={loading}
            >
              {showForm ? '✕ Cancel' : '+ Add Medicine Log'}
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="efm-page-modal-overlay fixed inset-0 z-[60] flex items-start justify-center overflow-hidden bg-background/80 backdrop-blur-sm px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={() => setShowForm(false)}>
              <div className="my-auto flex w-full max-w-2xl flex-col overflow-visible rounded-2xl border border-border bg-surface-container-highest edge-glow xl:max-w-5xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
                  <h3 className="text-xl font-bold text-foreground">{t("Add Medicine Log")}</h3>
                  <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 sm:px-5 sm:py-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Horse *")}</label>
                  <SearchableSelect
                    name="horseId"
                    options={horses.map(h => ({ value: h.id, label: h.name }))}
                    value={formData.horseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, horseId: e.target.value }))}
                    placeholder={t("Search horse...")}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Medicine Name *")}</label>
                  <SearchableSelect
                    name="medicineName"
                    options={medicineNames.map(m => ({ value: m, label: m }))}
                    value={formData.medicineName}
                    onChange={(e) => setFormData(prev => ({ ...prev, medicineName: e.target.value }))}
                    placeholder={t("Search or add medicine...")}
                    creatable
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Quantity *")}</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleFormChange} min="0" step="0.01" placeholder="0" required className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Unit")}</label>
                  <SelectField
                    value={formData.unit}
                    onChange={(val) => handleFormChange({ target: { name: 'unit', value: val } })}
                    options={UNITS}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Time Administered *")}</label>
                  <DateTimePicker value={formData.timeAdministered} onChange={(val) => handleFormChange({ target: { name: 'timeAdministered', value: val } })} required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Notes")}</label>
                <textarea name="notes" value={formData.notes} onChange={handleFormChange} placeholder={t("Additional notes about the medication...")} rows="3" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Treatment Photo")}</label>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                {formData.photoUrl && (
                  <img src={formData.photoUrl} alt="Preview" className="mt-3 max-w-[150px] max-h-[150px] rounded-lg border border-border" />
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-save-primary">
                  {loading ? 'Submitting...' : 'Submit Log'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} disabled={loading} className="h-10 px-6 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">
                  Cancel
                </button>
              </div>
            </form>
                </div>
              </div>
            </div>
          )}

          {loading && <TableSkeleton cols={6} rows={5} />}

          {!loading && filteredLogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLogs.map(log => (
                <div key={log.id} className="bg-surface-container-highest rounded-xl p-5 edge-glow border border-primary/10 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-foreground">{log.medicineName}</h3>
                    {getStatusBadge(log.approvalStatus)}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2"><span className="text-muted-foreground min-w-[70px]">Horse:</span> <strong className="text-foreground">{horseMap[log.horseId] || 'Unknown'}</strong></div>
                    <div className="flex gap-2"><span className="text-muted-foreground min-w-[70px]">Quantity:</span> <strong className="text-foreground">{log.quantity} {log.unit}</strong></div>
                    <div className="flex gap-2"><span className="text-muted-foreground min-w-[70px]">Time:</span> <strong className="text-foreground">{new Date(log.timeAdministered).toLocaleString('en-IN')}</strong></div>
                  </div>
                  {log.notes && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("Notes")}</span>
                      <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                    </div>
                  )}
                  {log.photoUrl && (
                    <div className="mt-3">
                      <img src={log.photoUrl} alt="Treatment" className="w-full max-h-[150px] object-cover rounded-lg cursor-pointer border border-border" onClick={() => window.open(log.photoUrl, '_blank')} />
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    {log.approvalStatus === 'pending' && (
                      <>
                        <button onClick={() => setSelectedLogForDetail(log)} disabled={loading} className="px-3 py-1.5 rounded-lg text-xs bg-surface-bright text-foreground font-medium hover:bg-surface-container-high transition-colors">✎ Edit</button>
                        <button onClick={() => handleDelete(log.id)} disabled={loading} className="px-3 py-1.5 rounded-lg text-xs bg-destructive/15 text-destructive font-medium hover:bg-destructive/25 transition-colors">✕ Delete</button>
                      </>
                    )}
                    <button onClick={() => setSelectedLogForDetail(log)} className="px-3 py-1.5 rounded-lg text-xs bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors ml-auto">{t("View Details")}</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && <p className="text-center py-8 text-sm text-muted-foreground">{t('No medicine logs yet')}</p>
          )}
        </div>
      )}

      {/* ═══════════ PENDING APPROVAL TAB ═══════════ */}
      {selectedTab === 'pending-approval' && canApprove && (
        <div className="space-y-4">
          {loading && <TableSkeleton cols={4} rows={4} />}

          {!loading && filteredLogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLogs.map(log => (
                <div key={log.id} className="bg-surface-container-highest rounded-xl p-5 edge-glow border border-primary/10 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-foreground">{log.medicineName}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-wider">{t("Medicine Log")}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2"><span className="text-muted-foreground min-w-[80px]">Horse:</span> <strong className="text-foreground">{horseMap[log.horseId] || 'Unknown'}</strong></div>
                    <div className="flex gap-2"><span className="text-muted-foreground min-w-[80px]">Quantity:</span> <strong className="text-foreground">{log.quantity} {log.unit}</strong></div>
                    <div className="flex gap-2"><span className="text-muted-foreground min-w-[80px]">Time:</span> <strong className="text-foreground">{new Date(log.timeAdministered).toLocaleString('en-IN')}</strong></div>
                    <div className="flex gap-2"><span className="text-muted-foreground min-w-[80px]">Logged by:</span> <strong className="text-foreground">{log.jamedar?.fullName || 'Unknown'}</strong></div>
                  </div>
                  {log.notes && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("Notes")}</span>
                      <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                    </div>
                  )}
                  {log.photoUrl && (
                    <div className="mt-3">
                      <img src={log.photoUrl} alt="Treatment" className="w-full max-h-[150px] object-cover rounded-lg cursor-pointer border border-border" onClick={() => window.open(log.photoUrl, '_blank')} />
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleApprove(log.id)} disabled={loading} className="px-4 py-2 rounded-lg text-xs bg-success/15 text-success font-semibold hover:bg-success/25 transition-colors">✓ Approve</button>
                    <button onClick={() => handleReject(log.id)} disabled={loading} className="px-4 py-2 rounded-lg text-xs bg-destructive/15 text-destructive font-semibold hover:bg-destructive/25 transition-colors">✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && <p className="text-center py-8 text-sm text-muted-foreground">{t('No pending medicine logs for approval')}</p>
          )}
        </div>
      )}

      {/* ═══════════ DETAIL MODAL ═══════════ */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedLogForDetail(null)}>
          <div className="bg-surface-container-highest rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">{t("Medicine Log Details")}</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSelectedLogForDetail(null)}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex gap-3"><span className="text-muted-foreground min-w-[100px] font-medium">Horse:</span> <strong className="text-foreground">{horseMap[selectedLogForDetail.horseId] || 'Unknown'}</strong></div>
                <div className="flex gap-3"><span className="text-muted-foreground min-w-[100px] font-medium">Medicine:</span> <strong className="text-foreground">{selectedLogForDetail.medicineName}</strong></div>
                <div className="flex gap-3"><span className="text-muted-foreground min-w-[100px] font-medium">Quantity:</span> <strong className="text-foreground">{selectedLogForDetail.quantity} {selectedLogForDetail.unit}</strong></div>
                <div className="flex gap-3"><span className="text-muted-foreground min-w-[100px] font-medium">Time:</span> <strong className="text-foreground">{new Date(selectedLogForDetail.timeAdministered).toLocaleString('en-IN')}</strong></div>
                <div className="flex gap-3"><span className="text-muted-foreground min-w-[100px] font-medium">Status:</span> {getStatusBadge(selectedLogForDetail.approvalStatus)}</div>
                <div className="flex gap-3"><span className="text-muted-foreground min-w-[100px] font-medium">Logged by:</span> <strong className="text-foreground">{selectedLogForDetail.jamedar?.fullName || 'Unknown'}</strong></div>
                {selectedLogForDetail.approvedBy && <div className="flex gap-3"><span className="text-muted-foreground min-w-[100px] font-medium">Approved by:</span> <strong className="text-foreground">{selectedLogForDetail.approvedBy.fullName}</strong></div>}
              </div>
              {selectedLogForDetail.rejectionReason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <span className="text-[10px] uppercase tracking-wider text-destructive font-semibold">{t("Rejection Reason")}</span>
                  <p className="text-sm text-foreground mt-1">{selectedLogForDetail.rejectionReason}</p>
                </div>
              )}
              {selectedLogForDetail.notes && (
                <div className="p-3 rounded-lg bg-surface-container-high">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("Notes")}</span>
                  <p className="text-sm text-muted-foreground mt-1">{selectedLogForDetail.notes}</p>
                </div>
              )}
              {selectedLogForDetail.photoUrl && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t("Treatment Photo")}</p>
                  <img src={selectedLogForDetail.photoUrl} alt="Treatment" className="w-full max-h-[250px] object-contain rounded-lg cursor-pointer border border-border" onClick={() => window.open(selectedLogForDetail.photoUrl, '_blank')} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Record"
        message={t("Are you sure you want to delete this record?")}
        confirmText={t("Delete")}
        confirmVariant="danger"
      />
    </div>
  );
};

export default MedicineLogsPage;
