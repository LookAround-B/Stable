import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Plus, X, Package, Scale, CalendarDays, Activity, Search } from 'lucide-react';
import DatePicker from '../components/shared/DatePicker';
import DateTimePicker from '../components/shared/DateTimePicker';
import ExportDialog from '../components/shared/ExportDialog';
import { downloadCsvFile } from '../lib/csvExport';
import { useAuth } from '../context/AuthContext';
import { writeRowsToXlsx } from '../lib/xlsxExport';
import useModalFeedbackToast from '../hooks/useModalFeedbackToast';

const getLocalDateTimeString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const HorseFeedsPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const taskCapabilities = user?.taskCapabilities || {};
  const canRecordHorseFeeds = Boolean(taskCapabilities.canRecordHorseFeeds);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [horses, setHorses] = useState([]);
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [summaryData, setSummaryData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useModalFeedbackToast({ open: showForm, message, type: messageType });

  const feedTypes = ['balance', 'barley', 'oats', 'soya', 'lucerne', 'linseed', 'rOil', 'biotin', 'joint', 'epsom', 'heylase'];
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const getFeedTypeDisplayName = (feedType) => {
    const displayNames = { 'balance': 'Himalayan Balance', 'rOil': 'R.Oil' };
    return displayNames[feedType] || feedType.charAt(0).toUpperCase() + feedType.slice(1);
  };

  const [formData, setFormData] = useState({
    horseId: '', date: new Date().toISOString().split('T')[0],
    balance: '', barley: '', oats: '', soya: '', lucerne: '', linseed: '',
    rOil: '', biotin: '', joint: '', epsom: '', heylase: '', notes: '',
    temporaryMenuName: '', menuStartAt: getLocalDateTimeString(), menuEndAt: getLocalDateTimeString(),
  });

  useEffect(() => { setFormData((prev) => ({ ...prev, date: toDate })); }, [toDate]);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/horse-feeds/summary', { params: { fromDate, toDate } });
      setSummaryData(response.data.data || {});
      setCurrentPage(1);
      setMessage('');
    } catch (error) {
      console.error('Error loading summary:', error);
      setMessage('Failed to load summary');
      setMessageType('error');
    } finally { setLoading(false); }
  }, [fromDate, toDate]);

  const loadHorses = useCallback(async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data.data || []);
    } catch (error) { console.error('Error loading horses:', error); }
  }, []);

  useEffect(() => { loadHorses(); loadRecords(); }, [loadHorses, loadRecords]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setMessageType('success');
    if (!formData.horseId || !formData.date) { setMessage('Please fill in required fields (Horse and Date)'); setMessageType('error'); return; }
    const hasMenuOverride = Boolean(formData.temporaryMenuName.trim());
    if (hasMenuOverride) {
      if (!formData.temporaryMenuName.trim()) { setMessage('Temporary menu name is required when using a menu period'); setMessageType('error'); return; }
      if (!formData.menuStartAt || !formData.menuEndAt) { setMessage('Menu start and end time are required'); setMessageType('error'); return; }
      if (new Date(formData.menuEndAt) < new Date(formData.menuStartAt)) { setMessage('Menu end time must be after the start time'); setMessageType('error'); return; }
    }
    try {
      setLoading(true);
      const submitData = {
        horseId: formData.horseId, date: formData.date,
        balance: formData.balance ? parseFloat(formData.balance) : null,
        barley: formData.barley ? parseFloat(formData.barley) : null,
        oats: formData.oats ? parseFloat(formData.oats) : null,
        soya: formData.soya ? parseFloat(formData.soya) : null,
        lucerne: formData.lucerne ? parseFloat(formData.lucerne) : null,
        linseed: formData.linseed ? parseFloat(formData.linseed) : null,
        rOil: formData.rOil ? parseFloat(formData.rOil) : null,
        biotin: formData.biotin ? parseFloat(formData.biotin) : null,
        joint: formData.joint ? parseFloat(formData.joint) : null,
        epsom: formData.epsom ? parseFloat(formData.epsom) : null,
        heylase: formData.heylase ? parseFloat(formData.heylase) : null,
        notes: formData.notes,
        temporaryMenuName: formData.temporaryMenuName || null,
        menuStartAt: formData.temporaryMenuName ? new Date(formData.menuStartAt).toISOString() : null,
        menuEndAt: formData.temporaryMenuName ? new Date(formData.menuEndAt).toISOString() : null,
      };
      await apiClient.post('/horse-feeds', submitData);
      setMessage('Feed record created successfully'); setMessageType('success');
      setFormData({ horseId: '', date: toDate, balance: '', barley: '', oats: '', soya: '', lucerne: '', linseed: '', rOil: '', biotin: '', joint: '', epsom: '', heylase: '', notes: '', temporaryMenuName: '', menuStartAt: getLocalDateTimeString(), menuEndAt: getLocalDateTimeString() });
      setShowForm(false);
      loadRecords();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create record'); setMessageType('error');
    } finally { setLoading(false); }
  };

  const summaryDataArray = Object.entries(summaryData).map(([horseId, data]) => ({ horseId, data }));

  // Filter by search
  const filteredSummary = summaryDataArray.filter(({ data }) =>
    searchTerm === '' || data.horseName?.toLowerCase().includes(searchTerm.toLowerCase()) || (data.stableNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || (data.temporaryMenuName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredSummary.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedSummary = filteredSummary.slice(startIndex, startIndex + rowsPerPage);

  // KPIs
  const totalHorses = summaryDataArray.length;
  const totalFeedKg = summaryDataArray.reduce((acc, { data }) => acc + feedTypes.reduce((s, ft) => s + (data[ft] || 0), 0), 0);
  const temporaryMenuChanges = summaryDataArray
    .map(({ horseId, data }) => ({ horseId, ...data }))
    .filter((item) => item.temporaryMenuName);
  const activeMenuChanges = temporaryMenuChanges.filter((item) => {
    if (!item.menuStartAt || !item.menuEndAt) return false;
    const now = new Date();
    return new Date(item.menuStartAt) <= now && new Date(item.menuEndAt) >= now;
  }).length;

  const getExportRows = () => summaryDataArray.map(({ data }) => {
      const total = feedTypes.reduce((s, ft) => s + (data[ft] || 0), 0).toFixed(2);
      return {
        'Horse': data.horseName || '-', 'Stable Number': data.stableNumber || '-',
        'Himalayan Balance': data.balance ? data.balance.toFixed(2) : '-',
        'Barley': data.barley ? data.barley.toFixed(2) : '-', 'Oats': data.oats ? data.oats.toFixed(2) : '-',
        'Soya': data.soya ? data.soya.toFixed(2) : '-', 'Lucerne': data.lucerne ? data.lucerne.toFixed(2) : '-',
        'Linseed': data.linseed ? data.linseed.toFixed(2) : '-', 'R.Oil': data.rOil ? data.rOil.toFixed(2) : '-',
        'Biotin': data.biotin ? data.biotin.toFixed(2) : '-', 'Joint': data.joint ? data.joint.toFixed(2) : '-',
        'Epsom': data.epsom ? data.epsom.toFixed(2) : '-', 'Heylase': data.heylase ? data.heylase.toFixed(2) : '-',
        'Temporary Menu': data.temporaryMenuName || '-',
        'Menu Start': data.menuStartAt ? new Date(data.menuStartAt).toLocaleString('en-IN') : '-',
        'Menu End': data.menuEndAt ? new Date(data.menuEndAt).toLocaleString('en-IN') : '-',
        'Total (kg)': total,
      };
    });
  const handleDownloadExcel = async () => {
    if (summaryDataArray.length === 0) return;
    const excelData = getExportRows();
    await writeRowsToXlsx(excelData, {
      sheetName: 'Horse Feeds',
      fileName: `HorseFeeds_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  };

  const handleDownloadCSV = () => {
    if (summaryDataArray.length === 0) return;
    downloadCsvFile(getExportRows(), `HorseFeeds_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (!p.viewHorseFeeds) return <Navigate to="/dashboard" replace />;

  return (
    <div className="horse-feeds-page space-y-6">
      {/* Header */}
      <div className="horse-feeds-header-row space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Horse <span className="text-primary">{t("Feeds")}</span></h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {canRecordHorseFeeds && (
              <button onClick={() => setShowForm(!showForm)} className="horse-feeds-header-btn h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
                {showForm ? <><X className="w-4 h-4" /> Close</> : <><Plus className="w-4 h-4" /> Add Feed</>}
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t('Record daily feed consumption for horses')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: t('Total Horses').toUpperCase(), value: String(totalHorses).padStart(2, '0'), icon: Package, sub: 'Horses in feed report' },
          { label: t('Total Feed (kg)').toUpperCase(), value: totalFeedKg.toFixed(1), icon: Scale, sub: 'Combined feed volume' },
          { label: t('Active Menu Changes').toUpperCase(), value: String(activeMenuChanges).padStart(2, '0'), icon: Activity, sub: 'Temporary feed periods running' },
          { label: t('Date Range').toUpperCase(), value: `${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`, icon: CalendarDays, sub: 'Selected reporting period', valueClass: 'text-2xl font-bold text-foreground mt-1 mono-data relative z-10' },
          { label: t('Avg per Horse (kg)').toUpperCase(), value: totalHorses > 0 ? (totalFeedKg / totalHorses).toFixed(1) : '0', icon: Activity, sub: 'Average feed allocation' },
        ].map(k => (
          <OperationalMetricCard key={k.label} label={k.label} value={k.value} icon={k.icon} colorClass="text-primary" bgClass="bg-primary/10" sub={k.sub} valueClass={k.valueClass || 'text-3xl font-bold text-foreground mt-1 mono-data relative z-10'} hideSub />
        ))}
      </div>

      {temporaryMenuChanges.length > 0 && (
        <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Temporary Menu Changes</h3>
          </div>
          <div className="divide-y divide-border/50">
            {temporaryMenuChanges.map((item) => (
              <div key={item.horseId} className="px-5 py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.horseName}{item.stableNumber ? ` (${item.stableNumber})` : ''}</p>
                  <p className="text-sm text-muted-foreground">{item.temporaryMenuName}</p>
                </div>
                <p className="text-xs text-muted-foreground mono-data">
                  {item.menuStartAt ? new Date(item.menuStartAt).toLocaleString('en-IN') : '-'} to {item.menuEndAt ? new Date(item.menuEndAt).toLocaleString('en-IN') : '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === 'error' ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* Date Filters + Search */}
      <div className="horse-feeds-toolbar flex flex-col lg:flex-row items-stretch lg:items-end gap-4">
        <div className="horse-feeds-search relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder={t("Search horse name...")} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="h-10 w-full pl-10 pr-4 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
          {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" type="button"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="horse-feeds-toolbar-actions flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="horse-feeds-date-range flex items-center gap-3">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("From")}</label>
              <div className="relative">
                <DatePicker value={fromDate} onChange={(val) => setFromDate(val)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("To")}</label>
              <DatePicker value={toDate} onChange={(val) => setToDate(val)} />
            </div>
          </div>
          {summaryDataArray.length > 0 && (
            <ExportDialog
              title={t("Export Horse Feeds")}
              options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
              trigger={(
                <button className="btn-download horse-feeds-export h-10 w-10 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center" type="button" aria-label={t("Export horse feeds")} title={t("Export horse feeds")}>
                  <Download className="w-4 h-4 shrink-0" />
                </button>
              )}
            />
          )}
        </div>
      </div>

      {/* Add Feed Record Form */}
      {canRecordHorseFeeds && showForm && ReactDOM.createPortal(
        <div className="efm-page-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-background/80 px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={() => setShowForm(false)}>
          <div className="my-auto flex w-full max-w-6xl flex-col overflow-visible rounded-xl border border-border bg-surface-container-highest" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
              <h3 className="text-xl font-bold text-foreground">{t('New Feed Record')}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:px-5 sm:py-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Horse *")}</label>
                    <SearchableSelect id="horseId" name="horseId" value={formData.horseId} onChange={handleFormChange} placeholder={t("Select a horse")} required options={[{ value: '', label: 'Select a horse' }, ...horses.map(h => ({ value: h.id, label: `${h.name} (${h.stableNumber || 'No Stable #'})` }))]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Date *")}</label>
                    <DatePicker value={formData.date} onChange={(val) => handleFormChange({ target: { name: 'date', value: val } })} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Temporary Menu Name")}</label>
                    <input type="text" id="temporaryMenuName" name="temporaryMenuName" value={formData.temporaryMenuName} onChange={handleFormChange} placeholder="e.g. Summer Recovery Feed" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Menu Start Time")}</label>
                    <DateTimePicker
                      value={formData.menuStartAt}
                      onChange={(val) => handleFormChange({ target: { name: 'menuStartAt', value: val } })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Menu End Time")}</label>
                    <DateTimePicker
                      value={formData.menuEndAt}
                      onChange={(val) => handleFormChange({ target: { name: 'menuEndAt', value: val } })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {feedTypes.map((feedType) => (
                    <div key={feedType}>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{getFeedTypeDisplayName(feedType)}</label>
                      <input type="number" step="0.1" id={feedType} name={feedType} value={formData[feedType]} onChange={handleFormChange} placeholder="kg" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Notes (Optional)")}</label>
                  <textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Any additional notes" rows="2" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="btn-save-primary">{loading ? 'Saving...' : 'Save Record'}</button>
                  <button type="button" onClick={() => setShowForm(false)} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Summary Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">
            Feed Consumption Summary — {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}
          </h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading summary...</div>
        ) : Object.keys(summaryData).length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Horse', 'Stable #', 'H.Balance', 'Barley', 'Oats', 'Soya', 'Lucerne', 'Linseed', 'R.Oil', 'Biotin', 'Joint', 'Epsom', 'Heylase', 'Menu Override', 'Total'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSummary.map(({ horseId, data }) => {
                    const total = feedTypes.reduce((s, ft) => s + (data[ft] || 0), 0).toFixed(2);
                    return (
                      <tr key={horseId} className="border-b border-border/50 hover:bg-surface-container-high transition-colors">
                        <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{data.horseName}</td>
                        <td className="px-3 py-3 text-muted-foreground">{data.stableNumber || '-'}</td>
                        {feedTypes.map(ft => (
                          <td key={ft} className="px-3 py-3 text-muted-foreground mono-data">{data[ft] ? data[ft].toFixed(2) : '-'}</td>
                        ))}
                        <td className="px-3 py-3 text-muted-foreground">
                          {data.temporaryMenuName ? (
                            <div className="min-w-[180px]">
                              <p className="text-foreground font-medium">{data.temporaryMenuName}</p>
                              <p className="text-[11px] mono-data">{data.menuStartAt ? new Date(data.menuStartAt).toLocaleString('en-IN') : '-'} to {data.menuEndAt ? new Date(data.menuEndAt).toLocaleString('en-IN') : '-'}</p>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-3 font-bold text-primary mono-data">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }} total={filteredSummary.length} />
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No feed data available for the selected date range</div>
        )}
      </div>
    </div>
  );
};

export default HorseFeedsPage;
