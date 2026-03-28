import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Plus, X, ClipboardCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import DatePicker from '../components/shared/DatePicker';

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

  const handleDownloadExcel = () => {
    if (!worksheets.length) { alert('No data'); return; }
    const rows = [];
    worksheets.forEach(ws => {
      if (ws.entries && ws.entries.length) {
        ws.entries.forEach(entry => { rows.push({ 'Date': ws.date ? new Date(ws.date).toLocaleDateString('en-GB') : '', 'Groom': ws.groom?.fullName || '', 'Horse': getHorseName(entry.horseId), 'Morning Hours': entry.amHours || 0, 'PM Hours': entry.pmHours || 0, 'Total Hours': entry.wholeDayHours || 0, 'Woodchips': entry.woodchipsUsed || 0, 'Bichali (kg)': entry.bichaliUsed || 0, 'Boo Sa (bags)': entry.booSaUsed || 0, 'Remarks': entry.remarks || '' }); });
      } else { rows.push({ 'Date': ws.date ? new Date(ws.date).toLocaleDateString('en-GB') : '', 'Groom': ws.groom?.fullName || '', 'Horse': '', 'Morning Hours': '', 'PM Hours': '', 'Total Hours': '', 'Woodchips': '', 'Bichali (kg)': '', 'Boo Sa (bags)': '', 'Remarks': '' }); }
    });
    if (!rows.length) { alert('No data'); return; }
    const wb = XLSX.utils.book_new(); const wsSheet = XLSX.utils.json_to_sheet(rows); XLSX.utils.book_append_sheet(wb, wsSheet, 'Groom WorkSheet'); XLSX.writeFile(wb, `GroomWorkSheet_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";

  if (!p.viewGroomWorksheet) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"><ClipboardCheck className="w-7 h-7 inline-block mr-2 text-primary" />{t('Groom')} <span className="text-primary">Work Sheet</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Track groom activities, horse care hours, and supplies used daily.</p>
        </div>
        <button onClick={handleDownloadExcel} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> Excel</button>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('Failed') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}</div>}

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Date</label>
          <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} />
        </div>
        <div className="min-w-[200px]">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Groom Filter</label>
          <SearchableSelect value={filterGroomId} onChange={(e) => setFilterGroomId(e.target.value)} placeholder="All Grooms" options={[{ value: 'all', label: 'All Grooms' }, ...getGroomers().map(g => ({ value: g.id, label: g.fullName }))]} />
        </div>
        {canCreateWorksheet && (
          <button onClick={() => setShowAddForm(!showAddForm)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
            {showAddForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Worksheet</>}
          </button>
        )}
      </div>

      {/* Add Worksheet Form */}
      {showAddForm && canCreateWorksheet && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <h3 className="text-lg font-bold text-foreground mb-4">Create New Work Sheet</h3>
          <form onSubmit={handleSubmitWorksheet} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Groom</label>
                <SearchableSelect value={newWorksheet.groomId} onChange={(e) => setNewWorksheet({ ...newWorksheet, groomId: e.target.value })} placeholder="Select Groom" disabled={user?.designation === 'Groom'} options={[{ value: '', label: 'Select Groom' }, ...getGroomers().map(g => ({ value: g.id, label: g.fullName }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Overall Remarks</label>
                <textarea value={newWorksheet.remarks} onChange={(e) => setNewWorksheet({ ...newWorksheet, remarks: e.target.value })} placeholder="General notes for the day..." rows="2" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-foreground">Horse Entries</h4>
              {newWorksheet.entries.map((entry, index) => (
                <div key={index} className="bg-surface-container-high rounded-lg p-4 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Horse {index + 1}</h5>
                    {newWorksheet.entries.length > 1 && (
                      <button type="button" onClick={() => handleRemoveEntry(index)} className="h-7 px-2.5 rounded text-[10px] font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"><X className="w-3 h-3" /> Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Horse</label>
                      <SearchableSelect value={entry.horseId} onChange={(e) => handleEntryChange(index, 'horseId', e.target.value)} placeholder="Select Horse" options={[{ value: '', label: 'Select Horse' }, ...horses.map(h => ({ value: h.id, label: h.name }))]} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">AM Hours</label>
                      <input type="number" step="0.5" min="0" value={entry.amHours} onChange={(e) => handleEntryChange(index, 'amHours', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">PM Hours</label>
                      <input type="number" step="0.5" min="0" value={entry.pmHours} onChange={(e) => handleEntryChange(index, 'pmHours', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Total</label>
                      <input type="number" value={entry.wholeDayHours} disabled className="w-full h-10 px-3 rounded-lg bg-surface-container border border-border text-foreground/60 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Woodchips (B)</label>
                      <input type="number" step="0.5" min="0" value={entry.woodchipsUsed} onChange={(e) => handleEntryChange(index, 'woodchipsUsed', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Bichali (kg)</label>
                      <input type="number" step="0.5" min="0" value={entry.bichaliUsed} onChange={(e) => handleEntryChange(index, 'bichaliUsed', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Boo Sa (bags)</label>
                      <input type="number" step="1" min="0" value={entry.booSaUsed} onChange={(e) => handleEntryChange(index, 'booSaUsed', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Remarks</label>
                      <input type="text" value={entry.remarks} onChange={(e) => handleEntryChange(index, 'remarks', e.target.value)} placeholder="Notes..." className={inputCls} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={handleAddEntry} className="h-9 px-4 rounded-lg border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"><Plus className="w-4 h-4 inline mr-1" />Add Horse</button>
            </div>

            <button type="submit" disabled={loading} className="h-10 px-6 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">{loading ? 'Creating...' : 'Create Worksheet'}</button>
          </form>
        </div>
      )}

      {/* Worksheets List */}
      {worksheets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No worksheets for {selectedDate}</div>
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
                  {worksheet.entries.map((entry, idx) => (
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
                  ))}
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
