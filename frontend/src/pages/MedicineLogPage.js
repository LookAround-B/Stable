import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Plus, X, Pill, Activity, CheckCircle, AlertTriangle, Search, SlidersHorizontal, Camera } from 'lucide-react';
import * as XLSX from 'xlsx';
import DateTimePicker from '../components/shared/DateTimePicker';
import SelectField from '../components/shared/SelectField';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';

const inp = 'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none';
const lbl = 'label-sm text-muted-foreground block mb-1.5 uppercase tracking-wider text-[10px] font-semibold';

const MedicineLogPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [horses, setHorses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    horseId: '', medicineName: '', quantity: '', unit: 'ml',
    timeAdministered: new Date().toISOString().slice(0, 16),
    notes: '', photoUrl: '',
  });

  const UNITS = ['ml', 'g', 'tablets', 'drops', 'injections', 'ointment (g)'];

  useEffect(() => { loadMedicineLogs(); loadHorses(); }, []);

  const loadMedicineLogs = async () => {
    try { const response = await apiClient.get('/medicine-logs'); setLogs(response.data); }
    catch (error) { console.error('Error loading medicine logs:', error); }
  };

  const loadHorses = async () => {
    try { const response = await apiClient.get('/horses'); setHorses(response.data.data || response.data || []); }
    catch (error) { console.error('Error loading horses:', error); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData((prev) => ({
        ...prev,
        photoUrl: response.data.url || response.data.path,
      }));
    } catch (error) {
      console.error('Image upload failed:', error);
      setMessage('✗ Image upload failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      if (!formData.horseId || !formData.medicineName || !formData.quantity) {
        throw new Error('Please fill in all required fields');
      }
      const payload = {
        horseId: formData.horseId, medicineName: formData.medicineName,
        quantity: parseFloat(formData.quantity), unit: formData.unit,
        timeAdministered: new Date(formData.timeAdministered),
        notes: formData.notes || null, photoUrl: formData.photoUrl || null,
      };
      const response = await apiClient.post('/medicine-logs', payload);
      setMessage('✓ Medicine log created successfully!');
      setLogs([response.data, ...logs]); setShowForm(false);
      setFormData({ horseId: '', medicineName: '', quantity: '', unit: 'ml', timeAdministered: new Date().toISOString().slice(0, 16), notes: '', photoUrl: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage(`✗ Error: ${errorMsg}`);
    } finally { setLoading(false); }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filter === 'my') result = result.filter((log) => log.jamedarId === user?.id);
    else if (filter === 'pending') result = result.filter((log) => !log.isApproved);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(log =>
        (log.horse?.name || '').toLowerCase().includes(s) ||
        (log.medicineName || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [logs, filter, search, user?.id]);

  const getExportRows = () => logs.map(l => ({
      'Date': l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB') : '',
      'Horse': l.horse?.name || '', 'Medicine': l.medicineName,
      'Quantity': l.quantity, 'Unit': l.unit,
      'Time Administered': l.timeAdministered || '',
      'Jamedar': l.jamedar?.fullName || l.administeredBy?.fullName || '',
      'Notes': l.notes || '', 'Status': l.isApproved ? 'Approved' : 'Pending',
    }));

  const handleDownloadExcel = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data to download'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Medicine Log');
    XLSX.writeFile(wb, `MedicineLog_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleDownloadCSV = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data to download'); return; }
    downloadCsvFile(data, `MedicineLog_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const uniqueMedicines = [...new Set(logs.map(m => m.medicineName).filter(Boolean))].length;
  const uniqueHorsesTreated = [...new Set(logs.map(m => m.horse?.name).filter(Boolean))].length;
  const pendingCount = logs.filter(l => !l.isApproved).length;

  if (!p.viewMedicineLogs) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Medicine')} <span className="text-primary">{t('Logs')}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Track medicine administration records and treatment history')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportDialog
            title={t("Export Medicine Logs")}
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button className="h-9 w-9 rounded-lg border border-border text-foreground flex items-center justify-center hover:bg-surface-container-high transition-colors" type="button" aria-label={t("Export medicine logs")} title={t("Export medicine logs")}>
                <Download className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          />
          <button onClick={() => setShowForm(!showForm)} className="h-9 px-4 sm:px-5 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showForm ? t('Cancel') : t('+ Add Log')}</span><span className="sm:hidden">{t('Add')}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${message.includes('✗') ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-success/15 text-success border-success/30'}`}>
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL ADMINISTRATIONS', value: logs.length, icon: Pill, color: 'text-primary' },
          { label: 'UNIQUE MEDICINES', value: uniqueMedicines, icon: Activity, color: 'text-foreground' },
          { label: 'HORSES TREATED', value: uniqueHorsesTreated, icon: CheckCircle, color: 'text-success' },
          { label: 'PENDING FOLLOW-UPS', value: pendingCount, icon: AlertTriangle, color: 'text-warning' },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{k.label}</span>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><k.icon className="w-4 h-4 text-primary" /></div>
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{String(k.value).padStart(2, '0')}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto bg-background/80 backdrop-blur-sm px-4 pb-4 pt-[72px] sm:p-6" onClick={() => setShowForm(false)}>
          <div className="my-auto flex min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-container-highest max-h-[calc(100dvh-5.5rem)] sm:max-h-[90vh] edge-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">{t('Log Medicine Administration')}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="z-10">
                <label className={lbl}>{t('Horse')} *</label>
                <SearchableSelect
                  name="horseId" value={formData.horseId} onChange={handleInputChange}
                  placeholder="-- Select Horse --" required disabled={loading}
                  options={[
                    { value: '', label: '-- Select Horse --' },
                    ...horses.map(h => ({ value: h.id, label: `${h.name}${h.registrationNumber ? ` (${h.registrationNumber})` : ''}` }))
                  ]}
                />
              </div>
              <div>
                <label className={lbl}>{t('Medicine Name')} *</label>
                <input type="text" name="medicineName" value={formData.medicineName} onChange={handleInputChange} required disabled={loading} placeholder="e.g., Penicillin, Vitamin B12" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{t('Quantity')} *</label>
                  <input type="number" name="quantity" step="0.01" value={formData.quantity} onChange={handleInputChange} required disabled={loading} placeholder="Amount" className={inp} />
                </div>
                <div>
                  <label className={lbl}>{t('Unit')} *</label>
                  <SelectField
                    value={formData.unit}
                    onChange={(val) => handleInputChange({ target: { name: 'unit', value: val } })}
                    options={UNITS}
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <label className={lbl}>{t('Time Administered')} *</label>
                <DateTimePicker value={formData.timeAdministered} onChange={(val) => handleInputChange({ target: { name: 'timeAdministered', value: val } })} required disabled={loading} />
              </div>
              <div>
                <label className={lbl}>{t('Photo Evidence')}</label>
                <input type="file" id="medicine-photo-upload" accept="image/*" onChange={handleImageUpload} disabled={loading} className="hidden" />
                <label htmlFor="medicine-photo-upload" className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-surface-container-high">
                  <Camera className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{formData.photoUrl ? 'Change Photo' : 'Click to Upload'}</p>
                    <p className="text-xs text-muted-foreground truncate">{formData.photoUrl ? 'Photo uploaded' : 'JPG, PNG (Optional)'}</p>
                  </div>
                </label>
                {formData.photoUrl && (
                  <div className="mt-2">
                    <img src={formData.photoUrl} alt="Preview" className="max-w-[120px] max-h-[100px] rounded-lg border border-border object-cover" />
                  </div>
                )}
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className={lbl}>{t('Clinical Notes')}</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} disabled={loading} placeholder="Describe condition, reason, effects..." rows={2} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className="btn-save-primary w-full sm:w-auto">
                {loading ? t('Logging...') : t('Log Medicine')}
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Search horse or medicine...")} className="w-full h-10 pl-10 pr-8 rounded-lg bg-surface-container-high border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex flex-wrap gap-1 bg-surface-container-high rounded-lg p-1 w-fit">
          {[
            { key: 'all', label: `All (${logs.length})` },
            { key: 'my', label: 'My Logs' },
            { key: 'pending', label: `Pending (${pendingCount})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-surface-container-high border-b border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Horse')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Medicine')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Dosage')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Administered')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('By')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Notes')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-muted-foreground text-sm">{t('No medicine logs found')}</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground block">{log.horse?.name || '-'}</span>
                      <span className="text-[10px] text-muted-foreground">{log.horse?.registrationNumber || ''}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{log.medicineName}</td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">{log.quantity} {log.unit}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatTime(log.timeAdministered)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.jamedar?.fullName || log.administeredBy?.fullName || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate" title={log.notes}>{log.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${log.isApproved ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                        {log.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Alert */}
      <div className="bg-surface-container-highest rounded-xl p-5 edge-glow border-l-4 border-l-warning">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">{t('Stock Alerts')}</h3>
            <p className="text-xs text-muted-foreground">{t('Medicine logs with stock levels below 20 units will show alerts here. Check with Stable Manager for replenishment.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicineLogPage;
