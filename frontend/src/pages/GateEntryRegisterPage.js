import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Plus, X, LogIn, LogOut, Users, UserCheck, Car } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  useEffect(() => { loadData(); }, [loadData]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'newVisitorPhone') { setFormData(prev => ({ ...prev, [name]: value.replace(/[^\d]/g, '') })); return; }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePersonTypeChange = (type) => {
    setFormData(prev => ({ ...prev, personType: type, employeeId: '', visitorId: '', newVisitorName: '', newVisitorPurpose: '', newVisitorPhone: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccessMessage('');
    if (formData.personType === 'Staff' && !formData.employeeId) { setError('Please select a staff member'); return; }
    if (formData.personType === 'Visitor' && !formData.visitorId && !formData.newVisitorName) { setError('Please select or provide visitor details'); return; }
    try {
      const endpoint = formMode === 'entry' ? '/gate-entry/entry' : '/gate-entry/exit';
      await apiClient.post(endpoint, { personType: formData.personType, employeeId: formData.employeeId || null, visitorId: formData.visitorId || null, newVisitorName: formData.newVisitorName || null, newVisitorPurpose: formData.newVisitorPurpose || null, newVisitorPhone: formData.newVisitorPhone || null, vehicleNo: formData.vehicleNo || null, notes: formData.notes });
      setSuccessMessage(`${formMode === 'entry' ? 'Entry' : 'Exit'} recorded successfully`);
      setFormData({ personType: 'Staff', employeeId: '', visitorId: '', newVisitorName: '', newVisitorPurpose: '', newVisitorPhone: '', vehicleNo: '', notes: '' });
      setShowForm(false);
      setTimeout(() => { loadData(); setSuccessMessage(''); }, 1500);
    } catch (err) { setError(err.response?.data?.error || `Failed to record ${formMode}`); }
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

  const handleDownloadExcel = () => {
    if (!entries.length) { alert('No data'); return; }
    const data = entries.map(entry => ({ 'Name': entry.personType === 'staff' ? getStaffName(entry.employeeId) : (entry.visitor?.name || entry.personName || ''), 'Type': entry.personType, 'Vehicle': entry.vehicleNo || '', 'Entry': formatTime(entry.entryTime), 'Exit': formatTime(entry.exitTime), 'Duration': getTotalDuration(entry.entryTime, entry.exitTime), 'Purpose/Notes': entry.visitor?.purpose || entry.notes || '' }));
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data); XLSX.utils.book_append_sheet(wb, ws, 'Gate Register'); XLSX.writeFile(wb, `GateRegister_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";
  const activeIn = entries.filter(e => !e.exitTime).length;
  const totalExited = entries.filter(e => e.exitTime).length;

  if (!p.viewGateEntry) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Gate Entry/Exit')} <span className="text-primary">Register</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Recorded by Guard: {user?.fullName || 'Guard'}</p>
        </div>
      </div>

      {successMessage && <div className="px-4 py-3 rounded-lg text-sm font-medium bg-success/15 text-success border border-success/30">✓ {successMessage}</div>}
      {error && <div className="px-4 py-3 rounded-lg text-sm font-medium bg-destructive/15 text-destructive border border-destructive/30">✕ {error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: entries.length, icon: Users },
          { label: 'Currently Inside', value: activeIn, icon: LogIn },
          { label: 'Exited', value: totalExited, icon: LogOut },
          { label: 'Vehicles', value: entries.filter(e => e.vehicleNo).length, icon: Car },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{k.label}</p>
              <k.icon className="w-4 h-4 text-primary/60" />
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mono-data">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Entry/Exit Section */}
      <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
        <button onClick={() => setShowForm(!showForm)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Record Entry/Exit</>}
        </button>
        <div className="flex items-end gap-3 md:ml-auto">
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={inputCls} />
          </div>
          <button onClick={handleDownloadExcel} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mode */}
            <div className="flex items-center gap-4">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Operation:</label>
              <div className="flex gap-2">
                {['entry', 'exit'].map(m => (
                  <button key={m} type="button" onClick={() => setFormMode(m)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formMode === m ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground border border-transparent hover:bg-surface-container-highest'}`}>{m === 'entry' ? 'Entry' : 'Exit'}</button>
                ))}
              </div>
            </div>
            {/* Person Type */}
            <div className="flex items-center gap-4">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Person Type:</label>
              <div className="flex gap-2">
                {['Staff', 'Visitor'].map(pt => (
                  <button key={pt} type="button" onClick={() => handlePersonTypeChange(pt)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${formData.personType === pt ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground border border-transparent hover:bg-surface-container-highest'}`}>
                    {pt === 'Staff' ? <UserCheck className="w-4 h-4" /> : <Users className="w-4 h-4" />} {pt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.personType === 'Staff' && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Select Staff *</label>
                  <SearchableSelect name="employeeId" value={formData.employeeId} onChange={handleFormChange} placeholder="-- Choose Staff --" required options={[{ value: '', label: '-- Choose Staff --' }, ...staffList.map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))]} />
                </div>
              )}
              {formData.personType === 'Visitor' && (
                <>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Existing Visitor</label>
                    <SearchableSelect name="visitorId" value={formData.visitorId} onChange={handleFormChange} placeholder="-- Select Visitor --" options={[{ value: '', label: '-- Select Visitor --' }, ...visitorsList.map(v => ({ value: v.id, label: `${v.name} (${v.purpose})` }))]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Or New Visitor Name *</label>
                    <input type="text" name="newVisitorName" value={formData.newVisitorName} onChange={handleFormChange} placeholder="Full name" maxLength="50" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Phone</label>
                    <input type="text" name="newVisitorPhone" value={formData.newVisitorPhone} onChange={handleFormChange} placeholder="Phone" inputMode="numeric" maxLength="15" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Purpose *</label>
                    <input type="text" name="newVisitorPurpose" value={formData.newVisitorPurpose} onChange={handleFormChange} placeholder="e.g., Delivery, Meeting" maxLength="100" className={inputCls} />
                  </div>
                </>
              )}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Vehicle No.</label>
                <input type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleFormChange} placeholder="Registration" maxLength="15" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
                <input type="text" name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Additional notes" maxLength="250" className={inputCls} />
              </div>
            </div>
            <button type="submit" className={`h-10 px-6 rounded-lg text-sm font-semibold tracking-wider uppercase ${formMode === 'entry' ? 'bg-gradient-to-r from-success to-success/80 text-white' : 'bg-gradient-to-r from-warning to-warning/80 text-white'}`}>Record {formMode === 'entry' ? 'Entry' : 'Exit'}</button>
          </form>
        </div>
      )}

      {/* Register Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Gate Register — {new Date(selectedDate).toLocaleDateString('en-GB')}</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading gate entries...</div>
        ) : entries.length > 0 ? (
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
                {entries.map((entry) => (
                  <tr key={entry.id} className={`border-b border-border/50 hover:bg-surface-container-high transition-colors ${!entry.exitTime ? 'bg-success/5' : ''}`}>
                    <td className="px-3 py-3 font-medium text-foreground">{entry.personType === 'Staff' ? getStaffName(entry.employeeId) : entry.visitor?.name || 'Visitor'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${entry.personType === 'Staff' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-purple-500/30 text-purple-400 bg-purple-500/10'}`}>{entry.personType}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground mono-data">{entry.vehicleNo || '-'}</td>
                    <td className="px-3 py-3 text-muted-foreground mono-data whitespace-nowrap">{formatTime(entry.entryTime)}</td>
                    <td className="px-3 py-3 mono-data whitespace-nowrap">{entry.exitTime ? <span className="text-muted-foreground">{formatTime(entry.exitTime)}</span> : <span className="text-success text-xs font-semibold">Inside</span>}</td>
                    <td className="px-3 py-3 text-muted-foreground mono-data">{getTotalDuration(entry.entryTime, entry.exitTime)}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{entry.personType === 'Visitor' && entry.visitor ? entry.visitor.purpose : entry.notes || '-'}</td>
                    <td className="px-3 py-3">
                      {!entry.exitTime ? (
                        <button onClick={() => handleExit(entry.id)} className="h-7 px-3 rounded text-[10px] font-semibold bg-warning/15 border border-warning/30 text-warning hover:bg-warning/25 transition-colors">Mark Exit</button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Exited</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No gate entries for {new Date(selectedDate).toLocaleDateString()}</div>
        )}
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmExit} onCancel={() => setConfirmModal({ isOpen: false, id: null })} title="Confirm Exit" message="Are you sure you want to mark this entry as exited?" confirmText="Confirm" confirmVariant="primary" />
    </div>
  );
};

export default GateEntryRegisterPage;
