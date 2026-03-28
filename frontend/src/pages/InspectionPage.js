import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CardGridSkeleton } from '../components/Skeleton';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import OperationalMetricCard from '../components/OperationalMetricCard';
import inspectionService from '../services/inspectionService';
import apiClient from '../services/apiClient';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';
import { Download, Plus, X, Eye, Pencil, Trash2, CheckCircle, Upload, Search, AlertOctagon, ClipboardList, CheckCircle2, Activity } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import DatePicker from '../components/shared/DatePicker';

const InspectionPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [resolvingInspection, setResolvingInspection] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [message, setMessage] = useState('');
  const [horses, setHorses] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [isDragging, setIsDragging] = useState(false);
  const imgDropRef = useRef(null);

  const [filters, setFilters] = useState({ round: '', horseId: '', severityLevel: '', area: '', startDate: '', endDate: '' });
  const [formData, setFormData] = useState({ round: 'Morning', description: '', horseId: '', location: '', area: '', severityLevel: 'Low', images: [] });
  const [resolveData, setResolveData] = useState({ comments: '', resolutionNotes: '' });

  const ROUNDS = ['Morning', 'Afternoon', 'Evening'];
  const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
  const FACILITY_AREAS = ['Pony stables', 'Rear Paddocks', 'Private stables', 'Front office stables', 'Warm up arena', 'Jumping arena', 'Dressage arena', 'Camp Area', 'Forest Trail', 'Accommodation', 'Middle school', 'Top school', 'Gazebo area', 'Grooms rooms', 'Round yard', 'Paddocks'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const isJamedar = useMemo(() => user?.designation === 'Jamedar', [user?.designation]);
  const canViewAll = useMemo(() => ['Stable Manager', 'School Administrator', 'Director'].includes(user?.designation), [user?.designation]);

  const loadInspections = useCallback(async () => {
    try { setLoading(true); const data = await inspectionService.getAllInspections(filters); setInspections(data.inspections || []); }
    catch (error) { setMessage(`✗ Error loading inspections: ${error.message}`); }
    finally { setLoading(false); }
  }, [filters]);

  const loadHorses = useCallback(async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data.data || []);
    } catch { setHorses([]); }
  }, []);

  useEffect(() => { loadInspections(); loadHorses(); }, [loadInspections, loadHorses]);
  useEffect(() => {
    if (fullScreenImage) { const h = (e) => { if (e.key === 'Escape') setFullScreenImage(null); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }
  }, [fullScreenImage]);

  const handleFilterChange = (e) => { const { name, value } = e.target; setFilters(prev => ({ ...prev, [name]: value })); };
  const handleFormChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleFilesAdded = (files) => {
    const validFiles = Array.from(files).filter(f => { if (!f.type.startsWith('image/')) { setMessage('✗ Only images'); return false; } if (f.size > MAX_FILE_SIZE) { setMessage('✗ Max 5MB'); return false; } return true; });
    setFormData(prev => ({ ...prev, images: [...prev.images, ...validFiles].slice(0, 8) }));
  };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFilesAdded(e.dataTransfer.files); };
  const removeImage = (idx) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const handleEdit = (inspection) => {
    setEditingInspection(inspection);
    setFormData({ round: inspection.round, description: inspection.description, horseId: inspection.horseId || '', location: inspection.location, area: inspection.area || '', severityLevel: inspection.severityLevel, images: inspection.images?.length ? inspection.images : (inspection.image ? [inspection.image] : []) });
    setShowForm(true);
  };
  const handleView = (inspection) => setViewingInspection(inspection);
  const handleDelete = (id) => setConfirmModal({ isOpen: true, id });
  const confirmDelete = async () => {
    const id = confirmModal.id; setConfirmModal({ isOpen: false, id: null });
    try { setLoading(true); await inspectionService.deleteInspection(id); setMessage('✓ Deleted!'); await loadInspections(); setTimeout(() => setMessage(''), 3000); }
    catch (error) { setMessage(`✗ ${error.message}`); } finally { setLoading(false); }
  };
  const resetForm = () => { setFormData({ round: 'Morning', description: '', horseId: '', location: '', area: '', severityLevel: 'Low', images: [] }); setEditingInspection(null); };
  const closeForm = () => { resetForm(); setShowForm(false); };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolvingInspection) return;
    try { setLoading(true); await inspectionService.updateInspection(resolvingInspection.id, { status: 'Resolved', comments: resolveData.comments, resolutionNotes: resolveData.resolutionNotes }); setMessage('✓ Resolved!'); setResolvingInspection(null); setResolveData({ comments: '', resolutionNotes: '' }); await loadInspections(); setTimeout(() => setMessage(''), 3000); }
    catch (error) { setMessage(`✗ ${error.message}`); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.round || !formData.description || !formData.location || !formData.severityLevel || !formData.images.length) { setMessage('✗ All fields required incl. image'); return; }
    if (formData.description.length > 500) { setMessage('✗ Description max 500'); return; }
    if (formData.location.length > 100) { setMessage('✗ Location max 100'); return; }
    try {
      setLoading(true);
      if (editingInspection) { await inspectionService.updateInspection(editingInspection.id, formData); setMessage('✓ Updated!'); }
      else { await inspectionService.createInspection(formData); setMessage('✓ Reported!'); }
      resetForm(); await loadInspections(); setTimeout(() => setMessage(''), 3000);
    } catch (error) { setMessage(`✗ ${error.message}`); } finally { setLoading(false); }
  };

  const handleDownloadExcel = () => {
    if (!inspections.length) { alert('No data'); return; }
    const data = inspections.map(i => ({ 'Date': i.createdAt ? new Date(i.createdAt).toLocaleDateString('en-GB') : '', 'Round': i.round, 'Horse': i.horse?.name || '-', 'Area': i.area || '-', 'Location': i.location, 'Description': i.description, 'Severity': i.severityLevel, 'Reported By': i.jamedar?.fullName || '' }));
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data); XLSX.utils.book_append_sheet(wb, ws, 'Inspections'); XLSX.writeFile(wb, `Inspections_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // eslint-disable-next-line no-unused-vars
  const handleDownloadCSV = () => {
    if (!inspections.length) { alert('No data'); return; }
    const csvData = inspections.map(i => ({ 'Date': i.createdAt ? new Date(i.createdAt).toLocaleDateString('en-GB') : '', 'Round': i.round, 'Horse': i.horse?.name || '-', 'Area': i.area || '-', 'Location': i.location, 'Description': i.description, 'Severity': i.severityLevel, 'Reported By': i.jamedar?.fullName || '' }));
    const headers = Object.keys(csvData[0]);
    const escape = (val) => { const s = String(val ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [headers.map(escape).join(','), ...csvData.map(row => headers.map(h => escape(row[h])).join(','))];
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Inspections_${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') + ' ' + new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

  const severityBadge = (sev) => {
    const cfg = { Low: 'border-success/30 text-success bg-success/10', Medium: 'border-warning/30 text-warning bg-warning/10', High: 'border-orange-500/30 text-orange-400 bg-orange-500/10', Critical: 'border-destructive/30 text-destructive bg-destructive/10' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cfg[sev] || 'border-border text-muted-foreground'}`}>{sev}</span>;
  };
  const statusBadge = (status) => {
    const resolved = status === 'Resolved';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${resolved ? 'border-success/30 text-success bg-success/10' : 'border-warning/30 text-warning bg-warning/10'}`}>{t(status || 'Open')}</span>;
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";

  if (!p.viewInspections) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"><Search className="w-7 h-7 inline-block mr-2 text-primary" />{t('Jamedar Inspection')} <span className="text-primary">Rounds</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Report and track facility inspection issues</p>
        </div>
        {isJamedar && (
          <button onClick={() => setShowForm(!showForm)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
            {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Inspection</>}
          </button>
        )}
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('✗') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        {[
          { label: 'TOTAL RECORDED', value: String(inspections.length).padStart(2, '0'), icon: ClipboardList, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
          { label: 'OPEN ISSUES', value: String(inspections.filter(i => i.status !== 'Resolved').length).padStart(2, '0'), icon: Activity, colorClass: 'text-warning', bgClass: 'bg-warning/10' },
          { label: 'CRITICAL', value: String(inspections.filter(i => i.severityLevel === 'Critical' && i.status !== 'Resolved').length).padStart(2, '0'), icon: AlertOctagon, colorClass: 'text-destructive', bgClass: 'bg-destructive/10' },
          { label: 'RESOLVED', value: String(inspections.filter(i => i.status === 'Resolved').length).padStart(2, '0'), icon: CheckCircle2, colorClass: 'text-success', bgClass: 'bg-success/10' },
        ].map(k => (
          <OperationalMetricCard key={k.label} label={k.label} value={k.value} icon={k.icon} colorClass={k.colorClass} bgClass={k.bgClass} />
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Round</label>
          <SearchableSelect name="round" value={filters.round} onChange={handleFilterChange} options={[{ value: '', label: 'All Rounds' }, ...ROUNDS.map(r => ({ value: r, label: r }))]} placeholder="All..." searchable={false} />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Horse</label>
          <SearchableSelect name="horseId" value={filters.horseId} onChange={handleFilterChange} options={[{ value: '', label: 'All Horses' }, ...horses.map(h => ({ value: h.id, label: h.name }))]} placeholder="All..." />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Severity</label>
          <SearchableSelect name="severityLevel" value={filters.severityLevel} onChange={handleFilterChange} options={[{ value: '', label: 'All' }, ...SEVERITY_LEVELS.map(l => ({ value: l, label: l }))]} placeholder="All..." searchable={false} />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Area</label>
          <SearchableSelect name="area" value={filters.area} onChange={handleFilterChange} options={[{ value: '', label: 'All Areas' }, ...FACILITY_AREAS.map(a => ({ value: a, label: a }))]} placeholder="All..." />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">From</label>
          <DatePicker value={filters.startDate} onChange={(val) => handleFilterChange({ target: { name: 'startDate', value: val } })} size="sm" />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">To</label>
          <DatePicker value={filters.endDate} onChange={(val) => handleFilterChange({ target: { name: 'endDate', value: val } })} size="sm" />
        </div>
      </div>

      {/* Form */}
      {showForm && isJamedar && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <h3 className="text-lg font-bold text-foreground mb-4">{editingInspection ? t('Edit Inspection') : t('Report Issue')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Round *</label>
                <SearchableSelect name="round" value={formData.round} onChange={handleFormChange} options={ROUNDS.map(r => ({ value: r, label: r }))} required />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Severity *</label>
                <SearchableSelect name="severityLevel" value={formData.severityLevel} onChange={handleFormChange} options={SEVERITY_LEVELS.map(l => ({ value: l, label: l }))} required />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Horse</label>
                <SearchableSelect name="horseId" value={formData.horseId} onChange={handleFormChange} options={[{ value: '', label: 'Select Horse' }, ...horses.map(h => ({ value: h.id, label: h.name }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Location * <span className="text-muted-foreground/50">({formData.location.length}/100)</span></label>
                <input type="text" name="location" value={formData.location} onChange={handleFormChange} maxLength="100" placeholder="Location of issue" required className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Area</label>
                <SearchableSelect name="area" value={formData.area} onChange={handleFormChange} options={[{ value: '', label: 'Select Area' }, ...FACILITY_AREAS.map(a => ({ value: a, label: a }))]} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Description * <span className="text-muted-foreground/50">({formData.description.length}/500)</span></label>
              <textarea name="description" value={formData.description} onChange={handleFormChange} maxLength="500" placeholder="Describe the issue..." required rows={3} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Images * <span className="text-muted-foreground/50">(up to 8, max 5MB each)</span></label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => imgDropRef.current?.click()}>
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Drag & drop images or click to browse</p>
                <p className="text-xs text-muted-foreground/50 mt-1">{formData.images.length}/8 added</p>
              </div>
              <input ref={imgDropRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { handleFilesAdded(e.target.files); e.target.value = ''; }} />
              {formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                      <img src={img instanceof File ? URL.createObjectURL(img) : img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="h-10 px-6 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">{loading ? 'Submitting...' : editingInspection ? 'Update' : 'Submit'}</button>
              <button type="button" onClick={closeForm} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Inspections List */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Inspections ({inspections.length})</h2>
        <div className="flex gap-2">
          {inspections.length > 0 && <button onClick={handleDownloadExcel} className="h-8 px-3 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-surface-container-high transition-colors flex items-center gap-1"><Download className="w-3 h-3" />Excel</button>}
          {Object.values(filters).some(v => v) && <button onClick={() => setFilters({ round: '', horseId: '', severityLevel: '', area: '', startDate: '', endDate: '' })} className="h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-surface-container-high transition-colors">Clear Filters</button>}
        </div>
      </div>

      {loading && <CardGridSkeleton count={6} withImage />}

      {!loading && inspections.length === 0 && (
        <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Round', 'Horse', 'Area', 'Location', 'Severity', 'Status', 'Reported By', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-container px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nil Report
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && inspections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inspections.map((inspection) => (
            <div key={inspection.id} className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden hover:border-primary/20 border border-transparent transition-all">
              {/* Card Image */}
              {(inspection.images?.[0] || inspection.image) && (
                <div className="relative h-40 overflow-hidden">
                  <img src={inspection.images?.[0] || inspection.image} alt="Inspection" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  {inspection.images?.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs font-bold text-foreground px-2 py-0.5 rounded">+{inspection.images.length - 1}</span>
                  )}
                </div>
              )}
              {/* Card Content */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-500/30 text-blue-400 bg-blue-500/10">{inspection.round}</span>
                  {severityBadge(inspection.severityLevel)}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {inspection.horse && <p><span className="text-foreground font-medium">Horse:</span> {inspection.horse.name}</p>}
                  <p><span className="text-foreground font-medium">Location:</span> {inspection.location}</p>
                  {inspection.area && <p><span className="text-foreground font-medium">Area:</span> {inspection.area}</p>}
                  <p className="line-clamp-2">{inspection.description}</p>
                  <p><span className="text-foreground font-medium">By:</span> {inspection.jamedar?.fullName}</p>
                  <div className="flex items-center justify-between pt-1">
                    {statusBadge(inspection.status)}
                    <span className="text-[10px] text-muted-foreground/60 mono-data">{formatDate(inspection.createdAt)}</span>
                  </div>
                </div>
              </div>
              {/* Card Actions */}
              {(isJamedar || canViewAll) && (
                <div className="px-4 pb-4 flex gap-1.5">
                  <button onClick={() => handleView(inspection)} className="h-7 px-2.5 rounded text-[10px] font-semibold border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                  {isJamedar && (
                    <>
                      <button onClick={() => handleEdit(inspection)} className="h-7 px-2.5 rounded text-[10px] font-semibold border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                      <button onClick={() => handleDelete(inspection.id)} className="h-7 px-2.5 rounded text-[10px] font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3" /></button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingInspection && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingInspection(null)}>
          <div className="bg-surface-container-highest border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">{t('Inspection Details')}</h3>
              <button onClick={() => setViewingInspection(null)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Gallery */}
              <div className="flex flex-wrap gap-2">
                {(viewingInspection.images?.length ? viewingInspection.images : [viewingInspection.image]).filter(Boolean).map((url, i) => (
                  <img key={i} src={url} alt={`Inspection ${i + 1}`} className="w-24 h-24 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFullScreenImage(url)} />
                ))}
              </div>
              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Round', <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-500/30 text-blue-400 bg-blue-500/10">{viewingInspection.round}</span>],
                  ['Severity', severityBadge(viewingInspection.severityLevel)],
                  ['Date', formatDate(viewingInspection.createdAt)],
                  ['Location', viewingInspection.location],
                  ['Area', viewingInspection.area || '-'],
                  ['Horse', viewingInspection.horse?.name || '-'],
                  ['Reported By', `${viewingInspection.jamedar?.fullName} (${t(viewingInspection.jamedar?.designation)})`],
                  ['Status', statusBadge(viewingInspection.status)],
                ].map(([label, value], i) => (
                  <div key={i}>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                    <div className="mt-0.5 text-foreground">{value}</div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="mt-0.5 text-sm text-foreground">{viewingInspection.description}</p>
              </div>
              {viewingInspection.comments && <div><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Comments</p><p className="mt-0.5 text-sm text-foreground">{viewingInspection.comments}</p></div>}
              {viewingInspection.resolvedBy && (
                <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-sm space-y-1">
                  <p><span className="font-medium">Resolved By:</span> {viewingInspection.resolvedBy.fullName} ({t(viewingInspection.resolvedBy.designation)})</p>
                  <p><span className="font-medium">Resolved At:</span> {formatDate(viewingInspection.resolvedAt)}</p>
                  {viewingInspection.resolutionNotes && <p><span className="font-medium">Notes:</span> {viewingInspection.resolutionNotes}</p>}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border flex gap-2 justify-end">
              {isJamedar && viewingInspection.jamedarId === user?.id && <button onClick={() => { handleEdit(viewingInspection); setViewingInspection(null); }} className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
              {canViewAll && viewingInspection.status === 'Open' && <button onClick={() => { setResolvingInspection(viewingInspection); setResolveData({ comments: '', resolutionNotes: '' }); setViewingInspection(null); }} className="h-9 px-4 rounded-lg bg-success/15 border border-success/30 text-success text-sm font-medium hover:bg-success/25 transition-colors flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Resolve</button>}
              <button onClick={() => setViewingInspection(null)} className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image */}
      {fullScreenImage && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setFullScreenImage(null)}>
          <button onClick={() => setFullScreenImage(null)} className="absolute top-4 right-4 p-2 rounded-lg bg-surface-container-high text-foreground hover:bg-surface-container-highest transition-colors"><X className="w-5 h-5" /></button>
          <img src={fullScreenImage} alt="Full Screen" className="max-w-full max-h-[90vh] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          <p className="absolute bottom-6 text-xs text-muted-foreground">Click anywhere or ESC to close</p>
        </div>
      )}

      {/* Resolve Modal */}
      {resolvingInspection && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setResolvingInspection(null)}>
          <div className="bg-surface-container-highest border border-border rounded-xl p-7 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-foreground">{t('Resolve Inspection')}</h3>
              <button onClick={() => setResolvingInspection(null)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Comments <span className="text-muted-foreground/50">({resolveData.comments.length}/500)</span></label>
                <textarea name="comments" value={resolveData.comments} onChange={(e) => setResolveData(prev => ({ ...prev, comments: e.target.value }))} placeholder="Add comments..." maxLength="500" rows="3" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Resolution Notes <span className="text-muted-foreground/50">({resolveData.resolutionNotes.length}/500)</span></label>
                <textarea name="resolutionNotes" value={resolveData.resolutionNotes} onChange={(e) => setResolveData(prev => ({ ...prev, resolutionNotes: e.target.value }))} placeholder="Resolution details..." maxLength="500" rows="3" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-gradient-to-r from-success to-success/80 text-white text-sm font-semibold tracking-wider uppercase">{loading ? 'Processing...' : 'Resolve'}</button>
                <button type="button" onClick={() => setResolvingInspection(null)} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete} onCancel={() => setConfirmModal({ isOpen: false, id: null })} title="Delete Inspection" message="Are you sure you want to delete this inspection?" confirmText="Delete" confirmVariant="danger" />
    </div>
  );
};

export default InspectionPage;
