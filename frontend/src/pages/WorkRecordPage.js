import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Search, SlidersHorizontal, X, Plus, Wrench, Clock, ListChecks, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import DatePicker from '../components/shared/DatePicker';

const inp = 'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none';
const lbl = 'label-sm text-muted-foreground block mb-1.5 uppercase tracking-wider text-[10px]';

const STAFF_CATEGORIES = {
  office: { label: 'Office', roles: ['Executive Admin', 'Senior Executive Admin', 'Junior Admin', 'Executive Accounts', 'Senior Executive Accounts', 'Junior Accounts'] },
  instructors: { label: 'Instructors', roles: ['Instructor'] },
  riders: { label: 'Riders', roles: ['Rider'] },
  ridingBoys: { label: 'Riding Boys', roles: ['Riding Boy'] },
  jamedars: { label: 'Jamedars', roles: ['Jamedar'] }
};

const WorkRecordPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  
  const [workRecords, setWorkRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('office');
  const [filterStaffId, setFilterStaffId] = useState('all');
  
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [newWorkRecord, setNewWorkRecord] = useState({
    staffId: '',
    entries: [{ taskDescription: '', amHours: 0, pmHours: 0, wholeDayHours: 0, remarks: '' }],
    remarks: '',
  });

  const getStaffByCategory = useCallback((category) => {
    const categoryInfo = STAFF_CATEGORIES[category];
    if (!categoryInfo) return [];
    return employees.filter((e) => categoryInfo.roles.includes(e.designation));
  }, [employees]);

  const loadWorkRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date: selectedDate };
      if (filterStaffId !== 'all') params.staffId = filterStaffId;
      const response = await apiClient.get('/work-records', { params });
      setWorkRecords(response.data.data || []);
      setMessage('');
    } catch (error) {
      console.error('Error loading work records:', error);
      setMessage(t('Failed to load work records'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterStaffId, t]);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  useEffect(() => { loadWorkRecords(); loadEmployees(); }, [loadWorkRecords, loadEmployees]);

  const handleAddEntry = () => {
    setNewWorkRecord(prev => ({
      ...prev,
      entries: [...prev.entries, { taskDescription: '', amHours: 0, pmHours: 0, wholeDayHours: 0, remarks: '' }],
    }));
  };

  const handleRemoveEntry = (index) => {
    setNewWorkRecord(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  };

  const handleEntryChange = (index, field, value) => {
    const updated = [...newWorkRecord.entries];
    updated[index][field] = value;
    if (field === 'amHours' || field === 'pmHours') {
      updated[index].wholeDayHours = Number(updated[index].amHours) + Number(updated[index].pmHours);
    }
    setNewWorkRecord({ ...newWorkRecord, entries: updated });
  };

  const handleSubmitWorkRecord = async (e) => {
    e.preventDefault();
    if (!newWorkRecord.staffId || newWorkRecord.entries.length === 0) {
      setMessage(t('Please select a staff member and add at least one task entry'));
      return;
    }
    if (newWorkRecord.entries.some((e) => !e.taskDescription)) {
      setMessage(t('Please enter a task description for all entries'));
      return;
    }
    try {
      setLoading(true);
      const payload = {
        staffId: newWorkRecord.staffId,
        date: selectedDate,
        category: selectedCategory,
        entries: newWorkRecord.entries.map((e) => ({
          taskDescription: e.taskDescription,
          amHours: Number(e.amHours),
          pmHours: Number(e.pmHours),
          wholeDayHours: Number(e.wholeDayHours),
          remarks: e.remarks,
        })),
        remarks: newWorkRecord.remarks,
      };
      await apiClient.post('/work-records', payload);
      await loadWorkRecords();
      setNewWorkRecord({
        staffId: '',
        entries: [{ taskDescription: '', amHours: 0, pmHours: 0, wholeDayHours: 0, remarks: '' }],
        remarks: '',
      });
      setShowAddForm(false);
      setMessage(t('Work record created successfully'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating work record:', error);
      setMessage(error.response?.data?.error || t('Failed to create work record'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!workRecords.length) { alert(t('No data to download')); return; }
    const rows = [];
    workRecords.forEach(wr => {
      if (wr.entries && wr.entries.length) {
        wr.entries.forEach(entry => {
          rows.push({
            'Date': wr.date ? new Date(wr.date).toLocaleDateString('en-GB') : '',
            'Staff Member': wr.staff?.fullName || '',
            'Category': wr.category || '',
            'Task Description': entry.taskDescription || '',
            'Morning Hours': entry.amHours || 0,
            'PM Hours': entry.pmHours || 0,
            'Total Hours': entry.wholeDayHours || 0,
            'Remarks': entry.remarks || '',
          });
        });
      } else {
        rows.push({
          'Date': wr.date ? new Date(wr.date).toLocaleDateString('en-GB') : '',
          'Staff Member': wr.staff?.fullName || '',
          'Category': wr.category || '',
          'Task Description': '', 'Morning Hours': '', 'PM Hours': '', 'Total Hours': '', 'Remarks': '',
        });
      }
    });
    const wb = XLSX.utils.book_new();
    const wsSheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsSheet, 'Work Record');
    XLSX.writeFile(wb, `WorkRecord_${selectedDate}.xlsx`);
  };

  const getStaffName = (id) => employees.find(e => e.id === id)?.fullName || 'Unknown';

  const filteredRecords = useMemo(() => workRecords.filter(w => {
    if (search && !getStaffName(w.staffId).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [workRecords, search, employees]);

  const totalHours = filteredRecords.reduce((s, w) => s + (w.entries || []).reduce((a, e) => a + Number(e.wholeDayHours || 0), 0), 0);
  const totalTasks = filteredRecords.reduce((s, w) => s + (w.entries || []).length, 0);

  const canCreateWorkRecord = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Executive Admin', 'Senior Executive Admin'].includes(user?.designation);

  if (!p.viewGroomWorksheet) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Work Record')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Staff work activity logs and hours tracking')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button onClick={handleDownloadExcel} className="h-9 px-3 sm:px-4 rounded-lg border border-border text-foreground text-sm font-medium flex items-center gap-2 hover:bg-surface-container-high transition-colors">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t('Export CSV')}</span><span className="sm:hidden">{t('Export')}</span>
          </button>
          {canCreateWorkRecord && (
            <button onClick={() => setShowAddForm(!showAddForm)} className="h-9 px-4 sm:px-5 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all">
               {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
               {showAddForm ? t('Close Form') : t('New Record')}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${message.includes('Failed') || message.includes('error') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {message}
        </div>
      )}

      {showAddForm && canCreateWorkRecord && (
        <div className="bg-surface-container-highest rounded-xl p-6 border border-primary/20 shadow-lg relative edge-glow">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/50">
            <h3 className="text-lg font-bold text-foreground">{t('Create New Work Record')}</h3>
          </div>
          <form onSubmit={handleSubmitWorkRecord} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>{t('Staff Category')}</label>
                <SearchableSelect 
                  value={selectedCategory} 
                  onChange={(e) => { setSelectedCategory(e.target.value); setFilterStaffId('all'); setNewWorkRecord({...newWorkRecord, staffId: ''}); }}
                  options={Object.entries(STAFF_CATEGORIES).map(([key, cat]) => ({ value: key, label: t(cat.label) }))}
                />
              </div>
              <div className="z-10">
                 <label className={lbl}>{t('Staff Member')} *</label>
                 <SearchableSelect
                    value={newWorkRecord.staffId}
                    onChange={(e) => setNewWorkRecord({...newWorkRecord, staffId: e.target.value})}
                    placeholder="Select Staff"
                    options={[
                      { value: '', label: 'Select Staff' },
                      ...getStaffByCategory(selectedCategory).map(s => ({ value: s.id, label: s.fullName }))
                    ]}
                 />
              </div>
              <div className="md:col-span-2">
                 <label className={lbl}>{t('Overall Remarks (Optional)')}</label>
                 <textarea
                   className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none min-h-[60px]"
                   value={newWorkRecord.remarks}
                   onChange={e => setNewWorkRecord({...newWorkRecord, remarks: e.target.value})}
                   placeholder="General notes for the day..."
                 />
              </div>
            </div>

            <div className="bg-surface-container/50 rounded-lg p-5 border border-border/50">
               <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest text-primary">{t('Task Entries')}</h4>
               
               {newWorkRecord.entries.map((entry, idx) => (
                 <div key={idx} className="bg-surface-container-high rounded-xl p-4 border border-border mb-4 relative">
                    <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                       <span className="text-xs font-semibold text-muted-foreground uppercase">{t('Task')} {idx + 1}</span>
                       {newWorkRecord.entries.length > 1 && (
                         <button type="button" onClick={() => handleRemoveEntry(idx)} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 font-medium transition-colors">
                           <X className="w-3 h-3" /> Remove
                         </button>
                       )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className={lbl}>{t('Task Description')} *</label>
                        <input className={inp} type="text" placeholder="e.g. Stable cleaning, Riding, Maintenance..." value={entry.taskDescription} onChange={e => handleEntryChange(idx, 'taskDescription', e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                         <div>
                           <label className={lbl}>{t('AM Hours')}</label>
                           <input className={inp} type="number" step="0.5" min="0" value={entry.amHours} onChange={e => handleEntryChange(idx, 'amHours', e.target.value)} />
                         </div>
                         <div>
                           <label className={lbl}>{t('PM Hours')}</label>
                           <input className={inp} type="number" step="0.5" min="0" value={entry.pmHours} onChange={e => handleEntryChange(idx, 'pmHours', e.target.value)} />
                         </div>
                         <div>
                           <label className={lbl}>{t('Total Hours')}</label>
                           <input className={`${inp} bg-surface-container`} type="number" value={entry.wholeDayHours} disabled />
                         </div>
                      </div>
                      <div>
                         <label className={lbl}>{t('Task Remarks')}</label>
                         <input className={inp} type="text" placeholder="Optional notes for this task..." value={entry.remarks} onChange={e => handleEntryChange(idx, 'remarks', e.target.value)} />
                      </div>
                    </div>
                 </div>
               ))}
               
               <button type="button" onClick={handleAddEntry} className="w-full h-10 border border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors mt-2">
                  <Plus className="w-4 h-4" /> {t('Add Another Task')}
               </button>
            </div>

            <div className="flex justify-end pt-2">
               <button type="submit" disabled={loading} className="h-10 px-8 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                  {loading ? t('Creating...') : t('Create Record')}
               </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Staff on Record')}</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Wrench className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground">{String(filteredRecords.length).padStart(2, '0')}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Total Hours')}</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><Clock className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground">{totalHours}<span className="text-lg text-muted-foreground ml-1">hrs</span></p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Tasks Completed')}</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><ListChecks className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground">{String(totalTasks).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Search staff...")} className="w-full h-10 pl-10 pr-8 rounded-lg bg-surface-container-high border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
           <button onClick={() => setShowFilters(v => !v)} className={`shrink-0 h-10 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${showFilters ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-border/50'}`}>
              <SlidersHorizontal className="w-4 h-4" /> {t('Filters')}
           </button>
           <DatePicker
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              size="sm"
           />
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 items-end px-5 py-4 bg-surface-container-highest rounded-xl border border-border/50 shadow-inner">
          <div className="w-full sm:w-48 z-10">
             <label className={lbl}>{t('Filters')}</label>
             <SearchableSelect
               value={filterStaffId}
               onChange={(e) => setFilterStaffId(e.target.value)}
               placeholder="All Staff"
               options={[
                 { value: 'all', label: 'All Staff' },
                 ...employees.map(s => ({ value: s.id, label: s.fullName }))
               ]}
             />
          </div>
          {filterStaffId !== 'all' && (
             <button onClick={() => setFilterStaffId('all')} className="h-10 px-3 md:mt-auto rounded-lg text-xs font-semibold text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors flex items-center gap-1.5 shrink-0">
               <X className="w-3 h-3" /> {t('Clear')}
             </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
         {loading && filteredRecords.length === 0 ? (
           <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
         ) : filteredRecords.length === 0 ? (
           <div className="bg-surface-container-highest rounded-xl p-12 text-center border border-border/50 border-dashed">
              <span className="text-muted-foreground">{t('No work records found for the selected date and filters.')}</span>
           </div>
         ) : (
           filteredRecords.map(wr => {
              const staffName = getStaffName(wr.staffId);
              return (
                 <div key={wr.id} className="bg-surface-container-highest rounded-xl p-5 md:p-6 edge-glow relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300"></div>
                   <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-5 gap-3 pl-3">
                     <div>
                       <h3 className="text-xl font-bold text-foreground tracking-tight">{staffName}</h3>
                       <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{wr.category || 'Staff'} <span className="mx-2 opacity-50">•</span> <span className="font-mono text-primary/80">{new Date(wr.date).toLocaleDateString('en-GB')}</span></p>
                     </div>
                     <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 shadow-sm flex items-center gap-1.5 shrink-0">
                       <Clock size={14} /> {(wr.entries || []).reduce((s, e) => s + Number(e.wholeDayHours||0), 0)}h total
                     </span>
                   </div>
                   
                   <div className="overflow-x-auto pb-2 pl-3">
                      <table className="w-full text-sm min-w-[500px] border-collapse">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('Task Description')}</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground w-20">{t('Morning')}</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground w-20">{t('Afternoon')}</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-primary bg-primary/5 w-24">{t('Total')}</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('Remarks')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {(wr.entries || []).map((e, index) => (
                            <tr key={index} className="hover:bg-surface-container-high/30 transition-colors">
                              <td className="px-3 py-3 font-medium text-foreground">{e.taskDescription}</td>
                              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{e.amHours || 0}h</td>
                              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{e.pmHours || 0}h</td>
                              <td className="px-3 py-3 font-mono text-xs font-bold text-primary bg-primary/5">{e.wholeDayHours || 0}h</td>
                              <td className="px-3 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={e.remarks}>{e.remarks || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                   
                   {wr.remarks && (
                     <div className="mt-4 pl-3">
                        <p className="text-xs text-muted-foreground bg-surface-container-high p-3 rounded-lg border border-border/50 mt-1">
                          <span className="font-semibold text-foreground uppercase text-[10px] tracking-widest block mb-1">Overall Remarks</span>
                          {wr.remarks}
                        </p>
                     </div>
                   )}
                 </div>
              );
           })
         )}
      </div>
    </div>
  );
};

export default WorkRecordPage;
