import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Plus, X, ClipboardCheck } from 'lucide-react';
import DatePicker from '../components/shared/DatePicker';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';
import { writeRowsToXlsx } from '../lib/xlsxExport';
import useModalFeedbackToast, { shouldSuppressInlineModalFeedback } from '../hooks/useModalFeedbackToast';

const GroomWorkSheetPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [worksheets, setWorksheets] = useState([]);
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterGroomId, setFilterGroomId] = useState('all');

  const [newWorksheet, setNewWorksheet] = useState({
    groomId: user?.designation === 'Groom' ? user?.id : '',
    entries: [{ horseId: '', amHours: 0, pmHours: 0, wholeDayHours: 0, woodchipsUsed: 0, bichaliUsed: 0, booSaUsed: 0, remarks: '' }],
    remarks: '',
  });
  const suppressInlineMessage = shouldSuppressInlineModalFeedback({ open: showAddForm, message });

  useModalFeedbackToast({ open: showAddForm, message });

  const loadWorksheets = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date: selectedDate };
      if (filterGroomId !== 'all') params.groomId = filterGroomId;
      const response = await apiClient.get('/grooming/worksheet', { params });
      setWorksheets(response.data.data || []); setMessage('');
    } catch (error) { console.error('Error loading worksheets:', error); setMessage('Failed to load worksheets'); }
    finally { setLoading(false); }
  }, [selectedDate, filterGroomId]);

  const loadHorses = useCallback(async () => { try { const r = await apiClient.get('/horses'); setHorses(r.data.data || []); } catch {} }, []);
  const loadEmployees = useCallback(async () => { try { const r = await apiClient.get('/employees'); setEmployees(r.data.data || []); } catch {} }, []);
  useEffect(() => { loadWorksheets(); loadHorses(); loadEmployees(); }, [selectedDate, filterGroomId, loadWorksheets, loadHorses, loadEmployees]);

  const handleAddEntry = () => {
    setNewWorksheet({ ...newWorksheet, entries: [...newWorksheet.entries, { horseId: '', amHours: 0, pmHours: 0, wholeDayHours: 0, woodchipsUsed: 0, bichaliUsed: 0, booSaUsed: 0, remarks: '' }] });
  };
  const handleRemoveEntry = (index) => { setNewWorksheet({ ...newWorksheet, entries: newWorksheet.entries.filter((_, i) => i !== index) }); };
  const handleEntryChange = (index, field, value) => {
    const updatedEntries = [...newWorksheet.entries]; updatedEntries[index][field] = value;
    if (field === 'amHours' || field === 'pmHours') updatedEntries[index].wholeDayHours = Number(updatedEntries[index].amHours) + Number(updatedEntries[index].pmHours);
    setNewWorksheet({ ...newWorksheet, entries: updatedEntries });
  };

  const handleSubmitWorksheet = async (e) => {
    e.preventDefault();
    if (newWorksheet.entries.length === 0) { setMessage('Please add at least one entry'); return; }
    try {
      setLoading(true);
      const payload = { groomId: newWorksheet.groomId || null, date: selectedDate, entries: newWorksheet.entries.map(e => ({ horseId: e.horseId || null, amHours: Number(e.amHours), pmHours: Number(e.pmHours), wholeDayHours: Number(e.wholeDayHours), woodchipsUsed: Number(e.woodchipsUsed), bichaliUsed: Number(e.bichaliUsed), booSaUsed: Number(e.booSaUsed), remarks: e.remarks })), remarks: newWorksheet.remarks };
      const response = await apiClient.post('/grooming/worksheet', payload);
      setWorksheets([...worksheets, response.data.data]);
      setNewWorksheet({ groomId: user?.designation === 'Groom' ? user?.id : '', entries: [{ horseId: '', amHours: 0, pmHours: 0, wholeDayHours: 0, woodchipsUsed: 0, bichaliUsed: 0, booSaUsed: 0, remarks: '' }], remarks: '' });
      setShowAddForm(false); setMessage('Worksheet created successfully'); setTimeout(() => setMessage(''), 3000);
    } catch (error) { console.error('Error creating worksheet:', error); setMessage('Failed to create worksheet'); }
    finally { setLoading(false); }
  };

  const getHorseName = (id) => { const horse = horses.find(h => h.id === id); return horse ? horse.name : 'Unknown'; };
  const getGroomers = () => employees.filter(e => e.designation === 'Groom');

  const canCreateWorksheet = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Groom'].includes(user?.designation);

  const getExportRows = () => {
    const rows = [];
    worksheets.forEach(ws => {
      if (ws.entries && ws.entries.length) {
        ws.entries.forEach(entry => { rows.push({ 'Date': ws.date ? new Date(ws.date).toLocaleDateString('en-GB') : '', 'Groom': ws.groom?.fullName || '', 'Horse': getHorseName(entry.horseId), 'Morning Hours': entry.amHours || 0, 'PM Hours': entry.pmHours || 0, 'Total Hours': entry.wholeDayHours || 0, 'Woodchips': entry.woodchipsUsed || 0, 'Bichali (kg)': entry.bichaliUsed || 0, 'Boo Sa (bags)': entry.booSaUsed || 0, 'Remarks': entry.remarks || '' }); });
      } else { rows.push({ 'Date': ws.date ? new Date(ws.date).toLocaleDateString('en-GB') : '', 'Groom': ws.groom?.fullName || '', 'Horse': '', 'Morning Hours': '', 'PM Hours': '', 'Total Hours': '', 'Woodchips': '', 'Bichali (kg)': '', 'Boo Sa (bags)': '', 'Remarks': '' }); }
    });
    return rows;
  };

  const handleDownloadExcel = async () => {
    if (!worksheets.length) { showNoExportDataToast('No data'); return; }
    const rows = getExportRows();
    if (!rows.length) { showNoExportDataToast('No data'); return; }
    await writeRowsToXlsx(rows, {
      sheetName: 'Groom WorkSheet',
      fileName: `GroomWorkSheet_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  const handleDownloadCSV = () => {
    if (!worksheets.length) { showNoExportDataToast('No data'); return; }
    const rows = getExportRows();
    if (!rows.length) { showNoExportDataToast('No data'); return; }
    downloadCsvFile(rows, `GroomWorkSheet_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-gray-100 border border-gray-200 text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";

  if (!p.viewGroomWorksheet) return <Navigate to="/dashboard" replace />;

  return (
    <div className="groom-worksheet-page space-y-6">
      {/* Header */}
      <div className="groom-worksheet-header-row flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight whitespace-nowrap"><ClipboardCheck className="w-5 h-5 sm:w-7 sm:h-7 inline-block mr-1.5 sm:mr-2 text-primary" />{t('Groom')} <span className="text-primary">{t("Work Sheet")}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t("Track groom activities, horse care hours, and supplies used daily.")}</p>
        </div>
        {canCreateWorksheet && (
          <button onClick={() => setShowAddForm(!showAddForm)} className="groom-worksheet-header-btn h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
            {showAddForm ? <><X className="w-4 h-4" /> {t("Cancel")}</> : <><Plus className="w-4 h-4" /> New Worksheet</>}
          </button>
        )}
      </div>

      {message && !suppressInlineMessage && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('Failed') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}</div>}

      {/* Controls */}
      <div className="groom-worksheet-toolbar flex flex-col md:flex-row items-stretch md:items-end gap-4">
        <div className="groom-worksheet-date-field">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Date")}</label>
          <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} />
        </div>
        <div className="groom-worksheet-filter-field">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Groom Filter")}</label>
          <SearchableSelect size="sm" value={filterGroomId} onChange={(e) => setFilterGroomId(e.target.value)} placeholder="All Grooms" options={[{ value: 'all', label: 'All Grooms' }, ...getGroomers().map(g => ({ value: g.id, label: g.fullName }))]} />
        </div>
        <ExportDialog
          title={t("Export Groom Worksheet")}
          options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
          trigger={(
            <button disabled={worksheets.length === 0} className="btn-download groom-worksheet-export h-10 w-10 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed self-end md:self-auto md:ml-auto" type="button" aria-label={t("Export groom worksheet")} title={t("Export groom worksheet")}>
              <Download className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        />
      </div>

      {/* Add Worksheet Form */}
      {showAddForm && canCreateWorksheet && ReactDOM.createPortal(
        <div className="efm-page-modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto px-4 pb-4 pt-[72px] sm:p-6 bg-background/80" onClick={() => setShowAddForm(false)}>
          <div className="my-auto bg-white rounded-xl border border-border w-full max-w-4xl overflow-visible flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">{t("Create New Work Sheet")}</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
          <form onSubmit={handleSubmitWorksheet} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Groom")}</label>
                <SearchableSelect value={newWorksheet.groomId} onChange={(e) => setNewWorksheet({ ...newWorksheet, groomId: e.target.value })} placeholder={t("Select Groom")} disabled={user?.designation === 'Groom'} options={[{ value: '', label: 'Select Groom' }, ...getGroomers().map(g => ({ value: g.id, label: g.fullName }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Overall Remarks")}</label>
                <textarea value={newWorksheet.remarks} onChange={(e) => setNewWorksheet({ ...newWorksheet, remarks: e.target.value })} placeholder="General notes for the day..." rows="2" className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-foreground">Horse Entries</h4>
              {newWorksheet.entries.map((entry, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Horse {index + 1}</h5>
                    {newWorksheet.entries.length > 1 && (
                      <button type="button" onClick={() => handleRemoveEntry(index)} className="h-7 px-2.5 rounded text-[10px] font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"><X className="w-3 h-3" /> Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("Horse")}</label>
                      <SearchableSelect value={entry.horseId} onChange={(e) => handleEntryChange(index, 'horseId', e.target.value)} placeholder={t("Select Horse")} options={[{ value: '', label: 'Select Horse' }, ...horses.map(h => ({ value: h.id, label: h.name }))]} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("AM Hours")}</label>
                      <input type="number" step="0.5" min="0" value={entry.amHours} onChange={(e) => handleEntryChange(index, 'amHours', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("PM Hours")}</label>
                      <input type="number" step="0.5" min="0" value={entry.pmHours} onChange={(e) => handleEntryChange(index, 'pmHours', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("Total")}</label>
                      <input type="number" value={entry.wholeDayHours} disabled className="w-full h-10 px-3 rounded-lg bg-gray-200 border border-gray-300 text-foreground/60 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("Woodchips (B)")}</label>
                      <input type="number" step="0.5" min="0" value={entry.woodchipsUsed} onChange={(e) => handleEntryChange(index, 'woodchipsUsed', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("Bichali (kg)")}</label>
                      <input type="number" step="0.5" min="0" value={entry.bichaliUsed} onChange={(e) => handleEntryChange(index, 'bichaliUsed', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("Boo Sa (bags)")}</label>
                      <input type="number" step="1" min="0" value={entry.booSaUsed} onChange={(e) => handleEntryChange(index, 'booSaUsed', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{t("Remarks")}</label>
                      <input type="text" value={entry.remarks} onChange={(e) => handleEntryChange(index, 'remarks', e.target.value)} placeholder="Notes..." className={inputCls} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={handleAddEntry} className="h-9 px-4 rounded-lg border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"><Plus className="w-4 h-4 inline mr-1" />{t("Add Horse")}</button>
            </div>
          </form>
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={() => setShowAddForm(false)} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-highest transition-colors">{t("Cancel")}</button>
              <button onClick={handleSubmitWorksheet} disabled={loading} className="btn-save-primary groom-worksheet-submit">{loading ? 'Creating...' : 'Create Worksheet'}</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Worksheets List */}
      {worksheets.length === 0 ? (
        <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Horse', 'AM Hours', 'PM Hours', 'Total', 'Woodchips', 'Bichali (kg)', 'Boo Sa', 'Remarks'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nil Report
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        worksheets.map((worksheet) => (
          <div key={worksheet.id} className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">{worksheet.groom?.fullName || 'Unknown Groom'}</h3>
                <p className="text-[10px] text-muted-foreground">{worksheet.date ? new Date(worksheet.date).toLocaleDateString('en-GB') : ''}</p>
              </div>
              <span className="text-xs text-muted-foreground mono-data">{worksheet.entries?.length || 0} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Horse', 'AM Hours', 'PM Hours', 'Total', 'Woodchips', 'Bichali (kg)', 'Boo Sa', 'Remarks'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {worksheet.entries?.length ? (
                    worksheet.entries.map((entry, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-surface-container-high transition-colors">
                        <td className="px-3 py-3 font-medium text-foreground">{getHorseName(entry.horseId)}</td>
                        <td className="px-3 py-3 text-muted-foreground mono-data">{entry.amHours}</td>
                        <td className="px-3 py-3 text-muted-foreground mono-data">{entry.pmHours}</td>
                        <td className="px-3 py-3 text-primary font-bold mono-data">{entry.wholeDayHours}</td>
                        <td className="px-3 py-3 text-muted-foreground mono-data">{entry.woodchipsUsed || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground mono-data">{entry.bichaliUsed || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground mono-data">{entry.booSaUsed || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground text-xs">{entry.remarks || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Nil Report
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default GroomWorkSheetPage;
