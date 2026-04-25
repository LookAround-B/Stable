import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import { Download, Plus, Pencil, Trash2, ClipboardList, Clock, Activity, History, X } from 'lucide-react';
import DatePicker from '../components/shared/DatePicker';
import DateTimePicker from '../components/shared/DateTimePicker';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { showNoExportDataToast } from '../lib/exportToast';
import ExportDialog from '../components/shared/ExportDialog';
import { downloadCsvFile } from '../lib/csvExport';
import { writeRowsToXlsx } from '../lib/xlsxExport';
import useModalFeedbackToast, { shouldSuppressInlineModalFeedback } from '../hooks/useModalFeedbackToast';

const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getLocalDateTimeString = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const getDefaultSessionTimestamp = (dateStr = getTodayString()) => {
  const currentTime = getLocalDateTimeString().split('T')[1] || '09:00';
  return `${dateStr}T${currentTime}`;
};

const getInitialFormData = (dateStr = getTodayString()) => ({
  horseId: '',
  riderId: '',
  entryType: 'riding',
  workType: 'Task',
  duration: '',
  sessionAt: getDefaultSessionTimestamp(dateStr),
  notes: '',
});

const CAN_CREATE_RECORDS = ['Instructor'];
const DEFAULT_RIDING_WORK_TYPE = 'Task';
const WORK_TYPE_OPTIONS = [
  { value: 'Task', label: 'Task' },
  { value: 'Lesson', label: 'Lesson' },
  { value: 'Paddock', label: 'Paddock' },
  { value: 'Walker', label: 'Walker' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Shows', label: 'Shows' },
  { value: 'Pony Rides', label: 'pony rides' },
  { value: 'Horse Rides', label: 'horse rides' },
  { value: 'Grading', label: 'Grading' },
  { value: 'Hack', label: 'Hack' },
  { value: 'Leaderships', label: 'Leaderships' },
  { value: 'Schooling', label: 'Schooling' },
  { value: 'Jumping', label: 'Jumping' },
];
const ENTRY_TYPES = [
  { value: 'riding', label: 'Riding / Training' },
  { value: 'lunging', label: 'Lunging' },
  { value: 'rest', label: 'Rest' },
  { value: 'lame', label: 'Lame' },
];

const ENTRY_TYPE_WORK_TYPES = {
  riding: null,
  lunging: 'Lunging',
  rest: 'Rest',
  lame: 'Lame',
};

const normalizeWorkType = (workType) => {
  if (workType === 'Lunge' || workType === 'Launging') return 'Lunging';
  if (workType === 'pony rides') return 'Pony Rides';
  if (workType === 'horse rides') return 'Horse Rides';
  return workType || DEFAULT_RIDING_WORK_TYPE;
};

const isLungingWorkType = (workType) => normalizeWorkType(workType) === 'Lunging';
const isRestWorkType = (workType) => normalizeWorkType(workType) === 'Rest';
const isLameWorkType = (workType) => normalizeWorkType(workType) === 'Lame';
const isNonRidingWorkType = (workType) => isLungingWorkType(workType) || isRestWorkType(workType) || isLameWorkType(workType);

const getEntryTypeFromWorkType = (workType) => {
  if (isLungingWorkType(workType)) return 'lunging';
  if (isRestWorkType(workType)) return 'rest';
  if (isLameWorkType(workType)) return 'lame';
  return 'riding';
};

const getEffectiveWorkType = (formData) =>
  formData.entryType === 'riding'
    ? normalizeWorkType(formData.workType)
    : ENTRY_TYPE_WORK_TYPES[formData.entryType];

const getAvailableWorkTypeOptions = (currentWorkType) => {
  const normalizedWorkType = normalizeWorkType(currentWorkType);
  if (!normalizedWorkType || WORK_TYPE_OPTIONS.some((option) => option.value === normalizedWorkType)) {
    return WORK_TYPE_OPTIONS;
  }

  return [...WORK_TYPE_OPTIONS, { value: normalizedWorkType, label: normalizedWorkType }];
};

const getSessionLabel = (record) => {
  if (record?.rider?.fullName) {
    return record.rider.fullName;
  }

  if (isLungingWorkType(record?.workType)) return 'No rider (lunging)';
  if (isRestWorkType(record?.workType)) return 'Horse at rest';
  if (isLameWorkType(record?.workType)) return 'Horse marked lame';
  return '-';
};

const DailyWorkRecordsPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const canCreateRecords = CAN_CREATE_RECORDS.includes(user?.designation);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [formData, setFormData] = useState(() => getInitialFormData(getTodayString()));
  const suppressInlineMessage = shouldSuppressInlineModalFeedback({ open: showForm, message, type: messageType });

  useModalFeedbackToast({ open: showForm, message, type: messageType });
  const selectedWorkType = getEffectiveWorkType(formData);
  const riderRequired = formData.entryType === 'riding';
  const durationRequired = formData.entryType === 'riding' || formData.entryType === 'lunging';
  const notesRequired = formData.entryType === 'rest' || formData.entryType === 'lame';

  useEffect(() => {
    setFormData(prev => {
      const currentTime = prev.sessionAt?.split('T')[1] || getLocalDateTimeString().split('T')[1] || '09:00';
      return { ...prev, sessionAt: `${selectedDate}T${currentTime}` };
    });
  }, [selectedDate]);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/eirs', { params: { startDate: selectedDate, endDate: selectedDate } });
      setRecords(response.data.data || []); setMessage('');
    } catch (error) { setMessage('Failed to load records'); setMessageType('error'); }
    finally { setLoading(false); }
  }, [selectedDate]);

  const loadHorsesAndEmployees = async () => {
    try {
      const [horsesRes, employeesRes] = await Promise.all([apiClient.get('/horses'), apiClient.get('/employees')]);
      setHorses(horsesRes.data.data || []); setEmployees(employeesRes.data.data || []);
    } catch (error) { console.error('Error loading data:', error); }
  };

  useEffect(() => { loadRecords(); loadHorsesAndEmployees(); }, [selectedDate, loadRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'entryType') {
      setFormData(prev => ({
        ...prev,
        entryType: value,
        riderId: value === 'riding' ? prev.riderId : '',
        duration: value === 'rest' || value === 'lame' ? '' : prev.duration,
        workType:
          value === 'riding'
            ? (isNonRidingWorkType(prev.workType) ? DEFAULT_RIDING_WORK_TYPE : normalizeWorkType(prev.workType))
            : ENTRY_TYPE_WORK_TYPES[value],
      }));
      return;
    }
    if (name === 'workType') {
      const normalizedWorkType = normalizeWorkType(value);
      setFormData(prev => ({
        ...prev,
        workType: normalizedWorkType,
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.horseId || !formData.sessionAt || (riderRequired && !formData.riderId) || (durationRequired && !formData.duration) || (notesRequired && !formData.notes.trim())) { setMessage('Please fill all required fields'); setMessageType('error'); return; }
    try {
      setLoading(true);
      const payload = {
        horseId: formData.horseId,
        riderId: riderRequired ? formData.riderId : '',
        workType: selectedWorkType,
        duration: durationRequired ? parseInt(formData.duration) : 0,
        date: new Date(formData.sessionAt).toISOString(),
        notes: formData.notes.trim(),
      };
      if (editingId) { await apiClient.put(`/eirs/${editingId}`, payload); setMessage('Record updated successfully'); }
      else { await apiClient.post('/eirs', payload); setMessage('Record created successfully'); }
      setMessageType('success');
      setFormData(getInitialFormData(selectedDate));
      setEditingId(null); setShowForm(false); loadRecords();
    } catch (error) { setMessage(error.response?.data?.error || 'Failed to save'); setMessageType('error'); }
    finally { setLoading(false); }
  };

  const handleEdit = (record) => {
    const normalizedWorkType = normalizeWorkType(record.workType);
    setFormData({
      horseId: record.horseId,
      riderId: record.riderId || '',
      entryType: getEntryTypeFromWorkType(normalizedWorkType),
      workType: normalizedWorkType,
      duration: record.duration ? record.duration.toString() : '',
      sessionAt: getLocalDateTimeString(record.date),
      notes: record.notes || '',
    });
    setEditingId(record.id); setShowForm(true);
  };

  const handleDelete = (id) => setConfirmModal({ isOpen: true, id });
  const confirmDelete = async () => {
    const id = confirmModal.id; setConfirmModal({ isOpen: false, id: null });
    try { setLoading(true); await apiClient.delete(`/eirs/${id}`); setMessage('Record deleted'); setMessageType('success'); loadRecords(); }
    catch (error) { setMessage(error.response?.data?.error || 'Failed to delete'); setMessageType('error'); }
    finally { setLoading(false); }
  };

  const handleCancel = () => {
    setShowForm(false); setEditingId(null);
    setFormData(getInitialFormData(selectedDate));
  };

  const getExportRows = () => records.map(r => ({ 'Timestamp': r.date ? new Date(r.date).toLocaleString('en-GB') : '', 'Horse': r.horse?.name || '-', 'Rider / Session': getSessionLabel(r), 'Work Type': normalizeWorkType(r.workType), 'Duration (min)': r.duration || '-', 'Notes': r.notes || '' }));

  const handleDownloadExcel = async () => {
    if (records.length === 0) { showNoExportDataToast('No records'); return; }
    const data = getExportRows();
    await writeRowsToXlsx(data, {
      sheetName: 'Daily Work Records',
      fileName: `DailyWorkRecords_${selectedDate}.xlsx`,
      columnWidths: [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 30 }],
    });
  };

  const handleDownloadCSV = () => {
    if (records.length === 0) { showNoExportDataToast('No records'); return; }
    downloadCsvFile(getExportRows(), `DailyWorkRecords_${selectedDate}.csv`);
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";
  const availableWorkTypeOptions = getAvailableWorkTypeOptions(formData.workType);

  const totalMinutes = records.reduce((sum, r) => sum + (r.duration || 0), 0);
  const workTypeBadge = (wt) => {
    const normalizedWorkType = normalizeWorkType(wt);
    const colors = {
      Task: 'border-primary/30 text-primary bg-primary/10',
      Lesson: 'border-secondary/30 text-secondary bg-secondary/10',
      Paddock: 'border-success/30 text-success bg-success/10',
      Walker: 'border-warning/30 text-warning bg-warning/10',
      Lunging: 'border-muted-foreground/30 text-muted-foreground bg-muted-foreground/10',
      Roll: 'border-accent-foreground/30 text-accent-foreground bg-accent',
      Shows: 'border-primary/30 text-primary bg-primary/10',
      'Pony Rides': 'border-secondary/30 text-secondary bg-secondary/10',
      'Horse Rides': 'border-success/30 text-success bg-success/10',
      Grading: 'border-warning/30 text-warning bg-warning/10',
      Hack: 'border-destructive/30 text-destructive bg-destructive/10',
      Leaderships: 'border-primary/30 text-primary bg-primary/10',
      Schooling: 'border-secondary/30 text-secondary bg-secondary/10',
      Jumping: 'border-success/30 text-success bg-success/10',
      Rest: 'border-primary/30 text-primary bg-primary/10',
      Lame: 'border-destructive/30 text-destructive bg-destructive/10',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[normalizedWorkType] || 'border-border text-muted-foreground'}`}>{normalizedWorkType}</span>;
  };

  if (!p.viewEIRS) return <Navigate to="/dashboard" replace />;

  return (
    <div className="daily-work-records-page space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"><ClipboardList className="w-7 h-7 inline-block mr-2 text-primary" />{t('Daily Work')} <span className="text-primary">{t("Records (EIRS)")}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Equine Individual Record Sheets")}</p>
        </div>
      </div>

      {message && !suppressInlineMessage && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === 'error' ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}<button onClick={() => setMessage('')} className="ml-3 opacity-60 hover:opacity-100">✕</button></div>}

      {/* KPI Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        {[
          { label: 'RECORDED SESSIONS', value: String(records.length).padStart(2, '0'), icon: ClipboardList, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
          { label: 'TOTAL EXPERIENCED TIME', value: `${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`, icon: Clock, colorClass: 'text-success', bgClass: 'bg-success/10' },
          { label: 'HORSES ENGAGED', value: String([...new Set(records.map(r => r.horseId))].length).padStart(2, '0'), icon: Activity, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
          { label: 'AVG DURATION/HORSE', value: records.length ? `${Math.round(totalMinutes / records.length)}m` : '0m', icon: History, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <k.icon className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{k.label}</span>
              <div className={`w-9 h-9 rounded-lg ${k.bgClass} flex items-center justify-center`}>
                <k.icon className={`w-4 h-4 ${k.colorClass}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-1 mono-data relative z-10">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-44">
            <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} />
          </div>
        </div>
        <div className="w-full md:w-auto md:ml-auto flex justify-end">
          <ExportDialog
            title={t("Export Daily Work Records")}
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button disabled={loading} className="btn-download daily-work-records-export h-10 w-10 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center" type="button" aria-label={t("Export daily work records")} title={t("Export daily work records")}>
                <Download className="w-5 h-5" />
              </button>
            )}
          />
        </div>
        {!showForm && canCreateRecords && (
          <button onClick={() => setShowForm(true)} disabled={loading} className="h-10 px-5 rounded-lg bg-surface-container-high border border-border/50 text-foreground text-sm font-medium hover:bg-surface-container-highest hover:text-primary transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && canCreateRecords && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto bg-background/80 backdrop-blur-sm px-4 pb-4 pt-[72px] sm:p-6" onClick={handleCancel}>
          <div className="my-auto flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-container-highest max-h-[calc(100dvh-5.5rem)] sm:max-h-[90vh] edge-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">{editingId ? t('Edit Entry') : t('Add Entry')}</h3>
              <button type="button" onClick={handleCancel} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <DateTimePicker label={t("Timestamp *")} value={formData.sessionAt} onChange={(val) => setFormData(prev => ({ ...prev, sessionAt: val }))} required />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Horse *")}</label>
                <SearchableSelect name="horseId" value={formData.horseId} onChange={handleInputChange} placeholder={t("Select horse")} required options={[{ value: '', label: 'Select a horse' }, ...horses.map(h => ({ value: h.id, label: h.name }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Entry Type *")}</label>
                <SearchableSelect name="entryType" value={formData.entryType} onChange={handleInputChange} required options={ENTRY_TYPES.map(type => ({ value: type.value, label: t(type.label) }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t(riderRequired ? "Rider/Student *" : "Rider/Student")}</label>
                <SearchableSelect name="riderId" value={formData.riderId} onChange={handleInputChange} placeholder={t(riderRequired ? "Select rider" : "No rider required")} required={riderRequired} options={[{ value: '', label: riderRequired ? 'Select rider' : 'No rider assigned' }, ...employees.filter(emp => ['Rider', 'Riding Boy'].includes(emp.designation)).map(emp => ({ value: emp.id, label: `${emp.fullName} (${t(emp.designation)})` }))]} />
                {!riderRequired && <p className="mt-1 text-[11px] text-muted-foreground">{t(formData.entryType === 'lunging' ? 'Leave this empty when the horse is only going for lunging.' : 'Rider is not required for rest or lame horse entries.')}</p>}
              </div>
              {formData.entryType === 'riding' && (
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Work Type *")}</label>
                <SearchableSelect name="workType" value={formData.workType} onChange={handleInputChange} required options={availableWorkTypeOptions} />
              </div>
              )}
              {formData.entryType !== 'riding' && (
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Work Type")}</label>
                <div className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm flex items-center">
                  {t(selectedWorkType)}
                </div>
              </div>
              )}
              {durationRequired && (
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Duration (min) *")}</label>
                <input type="number" name="duration" value={formData.duration} onChange={handleInputChange} placeholder="45" min="1" required className={inputCls} />
              </div>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t(notesRequired ? "Notes / Reason *" : "Notes")}</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder={t(formData.entryType === 'rest' ? "Why is the horse on rest?" : formData.entryType === 'lame' ? "Describe the lameness or issue" : "Additional session notes")} rows={2} required={notesRequired} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="btn-save-primary">{loading ? 'Saving...' : editingId ? 'Save Changes' : 'Add Entry'}</button>
                  <button type="button" onClick={handleCancel} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Records Table */}
      {loading && <TableSkeleton cols={6} rows={5} />}

      {!loading && records.length === 0 && (
        <div className="bg-surface-container-highest rounded-xl p-12 text-center border border-border/50">
          <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <span className="text-sm text-muted-foreground">No records for {new Date(selectedDate).toLocaleDateString('en-GB')}</span>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("Timestamp")}</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("Horse")}</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("Rider / Session")}</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("Work Category")}</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("Duration")}</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("Remarks")}</th>
                  {canCreateRecords && <th className="px-5 py-3 w-24"></th>}
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} className="border-b border-border/50 hover:bg-surface-container-high/30 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{new Date(record.date).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">
                       <span className="inline-flex items-center gap-2">
                         <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary shrink-0 opacity-80">
                           {record.horse?.name?.charAt(0) || '-'}
                         </div>
                         {record.horse?.name || '-'}
                       </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{getSessionLabel(record)}</td>
                    <td className="px-5 py-4">{workTypeBadge(record.workType)}</td>
                    <td className="px-5 py-4 font-mono text-sm">
                      <span className="text-primary font-bold">{record.duration}</span>
                      <span className="text-muted-foreground ml-1">m</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground truncate max-w-[200px]" title={record.notes}>{record.notes || '-'}</td>
                    {canCreateRecords && (
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleEdit(record)} title={t("Edit")} className="p-1.5 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(record.id)} title={t("Delete")} className="p-1.5 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete} onCancel={() => setConfirmModal({ isOpen: false, id: null })} title="Delete Record" message={t("Are you sure you want to delete this record?")} confirmText={t("Delete")} confirmVariant="danger" />
    </div>
  );
};

export default DailyWorkRecordsPage;
