import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CardGridSkeleton } from '../components/Skeleton';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import inspectionService from '../services/inspectionService';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

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

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const imgDropRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    round: '',
    horseId: '',
    severityLevel: '',
    area: '',
    startDate: '',
    endDate: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    round: 'Morning',
    description: '',
    horseId: '',
    location: '',
    area: '',
    severityLevel: 'Low',
    images: [],
  });

  // Resolve form data
  const [resolveData, setResolveData] = useState({
    comments: '',
    resolutionNotes: '',
  });

  const ROUNDS = ['Morning', 'Afternoon', 'Evening'];
  const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
  const FACILITY_AREAS = [
    'Pony stables', 'Rear Paddocks', 'Private stables', 'Front office stables',
    'Warm up arena', 'Jumping arena', 'Dressage arena', 'Camp Area',
    'Forest Trail', 'Accommodation', 'Middle school', 'Top school',
    'Gazebo area', 'Grooms rooms', 'Round yard', 'Paddocks'
  ];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Check if user can create/edit (Jamedar only)
  const isJamedar = useMemo(() => user?.designation === 'Jamedar', [user?.designation]);
  
  // Check if user can view all (Stable Manager, School Administrator, Director)
  const canViewAll = useMemo(() => 
    ['Stable Manager', 'School Administrator', 'Director'].includes(user?.designation),
    [user?.designation]
  );

  const loadInspections = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading inspections with filters:', filters);
      const data = await inspectionService.getAllInspections(filters);
      console.log('Inspections data received:', data);
      setInspections(data.inspections || []);
    } catch (error) {
      console.error('✗ Error loading inspections:', error);
      setMessage(`✗ Error loading inspections: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadHorses = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      console.log('Loading horses from:', `${apiUrl}/horses`);
      
      const response = await fetch(`${apiUrl}/horses`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load horses: ${response.status}`);
      }
      
      const responseData = await response.json();
      const horsesData = Array.isArray(responseData) ? responseData : (responseData.data || []);
      console.log('Parsed horses:', horsesData);
      setHorses(horsesData);
    } catch (error) {
      console.error('Error loading horses:', error);
      setHorses([]);
    }
  }, []);

  useEffect(() => {
    loadInspections();
    loadHorses();
  }, [loadInspections, loadHorses]);

  // Handle ESC key to close full screen image
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        closeFullScreenImage();
      }
    };

    if (fullScreenImage) {
      window.addEventListener('keydown', handleEscKey);
      return () => window.removeEventListener('keydown', handleEscKey);
    }
  }, [fullScreenImage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    console.log(`🔄 Form field changed: ${name} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilesAdded = (files) => {
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) { setMessage('✗ Only image files allowed'); return false; }
      if (f.size > MAX_FILE_SIZE) { setMessage('✗ File too large (max 5MB each)'); return false; }
      return true;
    });
    setFormData(prev => ({ ...prev, images: [...prev.images, ...validFiles].slice(0, 8) }));
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFilesAdded(e.dataTransfer.files); };
  const removeImage = (idx) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const handleEdit = (inspection) => {
    console.log('✎ Editing inspection:', inspection.id);
    setEditingInspection(inspection);
    setFormData({
      round: inspection.round,
      description: inspection.description,
      horseId: inspection.horseId || '',
      location: inspection.location,
      area: inspection.area || '',
      severityLevel: inspection.severityLevel,
      images: inspection.images?.length ? inspection.images : (inspection.image ? [inspection.image] : []),
    });
    setShowForm(true);
  };

  const handleView = (inspection) => {
    console.log('👁 Viewing inspection:', inspection.id);
    setViewingInspection(inspection);
  };

  const closeViewModal = () => {
    setViewingInspection(null);
  };

  const closeFullScreenImage = () => {
    setFullScreenImage(null);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });

    try {
      setLoading(true);
      await inspectionService.deleteInspection(id);
      setMessage('✓ Inspection deleted successfully!');
      await loadInspections();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error deleting inspection: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      round: 'Morning',
      description: '',
      horseId: '',
      location: '',
      area: '',
      severityLevel: 'Low',
      images: [],
    });
    setEditingInspection(null);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    
    if (!resolvingInspection) return;

    try {
      setLoading(true);
      setMessage('Processing...');
      
      const updateData = {
        status: 'Resolved',
        comments: resolveData.comments,
        resolutionNotes: resolveData.resolutionNotes,
      };

      await inspectionService.updateInspection(resolvingInspection.id, updateData);
      setMessage('✓ Inspection resolved successfully!');
      setResolvingInspection(null);
      setResolveData({ comments: '', resolutionNotes: '' });
      await loadInspections();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error resolving inspection: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDataChange = (e) => {
    const { name, value } = e.target;
    setResolveData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.round || !formData.description || !formData.location || !formData.severityLevel || !formData.images.length) {
      setMessage('✗ All fields are required, including at least one image');
      return;
    }

    if (formData.description.length > 500) {
      setMessage('✗ Description cannot exceed 500 characters');
      return;
    }

    if (formData.location.length > 100) {
      setMessage('✗ Location cannot exceed 100 characters');
      return;
    }

    try {
      setLoading(true);
      console.log('Submitting inspection:', {
        round: formData.round,
        description: formData.description,
        location: formData.location,
        horseId: formData.horseId,
        severityLevel: formData.severityLevel,
      });

      if (editingInspection) {
        await inspectionService.updateInspection(editingInspection.id, formData);
        setMessage('✓ Inspection updated successfully!');
        resetForm(); // Clear form but keep it open
      } else {
        await inspectionService.createInspection(formData);
        setMessage('✓ Inspection reported successfully!');
        resetForm(); // Clear form but keep it open for next entry
      }

      await loadInspections();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (inspections.length === 0) {
      alert('No inspections to download');
      return;
    }

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    };

    // Prepare data for Excel
    const excelData = inspections.map((inspection) => ({
      'Date': formatDate(inspection.createdAt),
      'Round': inspection.round,
      'Horse': inspection.horse?.name || '-',
      'Area': inspection.area || '-',
      'Location': inspection.location,
      'Description': inspection.description,
      'Severity': inspection.severityLevel,
      'Reported By': inspection.jamedar?.fullName || '',
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 12 }, // Round
      { wch: 15 }, // Horse
      { wch: 18 }, // Area
      { wch: 15 }, // Location
      { wch: 30 }, // Description
      { wch: 12 }, // Severity
      { wch: 18 }, // Reported By
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspections');

    // Generate filename with date
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `Inspections_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
    console.log('📥 Downloaded inspections to:', filename);
  };

  // eslint-disable-next-line no-unused-vars
  const handleDownloadCSV = () => {
    if (inspections.length === 0) {
      alert('No inspections to download');
      return;
    }

    const formatDateShort = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('en-GB');
    };

    const csvData = inspections.map((inspection) => ({
      'Date': formatDateShort(inspection.createdAt),
      'Round': inspection.round,
      'Horse': inspection.horse?.name || '-',
      'Area': inspection.area || '-',
      'Location': inspection.location,
      'Description': inspection.description,
      'Severity': inspection.severityLevel,
      'Reported By': inspection.jamedar?.fullName || '',
    }));

    const headers = Object.keys(csvData[0]);
    const escape = (val) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [headers.map(escape).join(','), ...csvData.map(row => headers.map(h => escape(row[h])).join(','))];
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inspections_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Low': return '#2ecc71';
      case 'Medium': return '#f39c12';
      case 'High': return '#e74c3c';
      case 'Critical': return '#c0392b';
      default: return '#95a5a6';
    }
  };

  if (!p.viewInspections) return <Navigate to="/" replace />;

  return (
    <div className="inspection-page">
      <div className="inspection-header">
        <h1>{t('Jamedar Inspection Rounds')}</h1>
        {isJamedar && (
          <button 
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Cancel' : '+ Add Inspection Round'}
          </button>
        )}
      </div>

      {message && <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>{message}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Round</label>
          <SearchableSelect
            name="round"
            value={filters.round}
            onChange={handleFilterChange}
            options={[{ value: '', label: 'All Rounds' }, ...ROUNDS.map((round) => ({ value: round, label: round }))]}
            placeholder="Select round..."
            searchable={false}
          />
        </div>

        <div className="filter-group">
          <label>Horse</label>
          <SearchableSelect
            name="horseId"
            value={filters.horseId}
            onChange={handleFilterChange}
            options={[{ value: '', label: 'All Horses' }, ...horses.map((h) => ({ value: h.id, label: h.name }))]}
            placeholder="Select horse..."
          />
        </div>

        <div className="filter-group">
          <label>Severity</label>
          <SearchableSelect
            name="severityLevel"
            value={filters.severityLevel}
            onChange={handleFilterChange}
            options={[{ value: '', label: 'All Severity Levels' }, ...SEVERITY_LEVELS.map((level) => ({ value: level, label: level }))]}
            placeholder="Select severity..."
            searchable={false}
          />
        </div>

        <div className="filter-group">
          <label>Area</label>
          <SearchableSelect
            name="area"
            value={filters.area}
            onChange={handleFilterChange}
            options={[{ value: '', label: 'All Areas' }, ...FACILITY_AREAS.map((a) => ({ value: a, label: a }))]}
            placeholder="Select area..."
          />
        </div>

        <div className="filter-group">
          <label>From Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-group">
          <label>To Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Form */}
      {showForm && isJamedar && (
        <div className="inspection-form-section">
          <h2>{editingInspection ? t('Edit Inspection') : t('Report Issue')}</h2>
          <form onSubmit={handleSubmit} className="inspection-form">
            <div className="form-group">
              <label htmlFor="round-select">Round *</label>
              <SearchableSelect
                name="round"
                value={formData.round}
                onChange={handleFormChange}
                options={ROUNDS.map((round) => ({ value: round, label: round }))}
                placeholder="Select round..."
                required
              />
            </div>

            <div className="form-group">
              <label>Images * <span style={{ fontWeight: 'normal', color: '#888', fontSize: '0.85em' }}>(up to 8, max 5MB each)</span></label>
              <div
                className={`insp-drop-zone${isDragging ? ' insp-drop-zone--active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => imgDropRef.current?.click()}
              >
                <span>Drag &amp; drop images here, or click to browse</span>
                <span className="insp-drop-count">{formData.images.length}/8 added</span>
              </div>
              <input
                ref={imgDropRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { handleFilesAdded(e.target.files); e.target.value = ''; }}
              />
              {formData.images.length > 0 && (
                <div className="insp-thumb-grid">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="insp-thumb-item">
                      <img
                        src={img instanceof File ? URL.createObjectURL(img) : img}
                        alt={`Preview ${idx + 1}`}
                      />
                      <button
                        type="button"
                        className="insp-thumb-remove"
                        onClick={() => removeImage(idx)}
                      >&#x2715;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description-input">Description (Max 500 chars) *</label>
              <textarea
                id="description-input"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                maxLength="500"
                placeholder="Describe the issue..."
                required
              />
              <small>{formData.description.length}/500</small>
            </div>

            <div className="form-group">
              <label htmlFor="horse-select">Horse</label>
              <SearchableSelect
                name="horseId"
                value={formData.horseId}
                onChange={handleFormChange}
                options={[{ value: '', label: 'Select Horse' }, ...horses.map((h) => ({ value: h.id, label: h.name }))]}
                placeholder="Select horse..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="location-input">Location (Max 100 chars) *</label>
              <input
                id="location-input"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                maxLength="100"
                placeholder="Location of issue..."
                required
              />
              <small>{formData.location.length}/100</small>
            </div>

            <div className="form-group">
              <label htmlFor="severity-select">Severity Level *</label>
              <SearchableSelect
                name="severityLevel"
                value={formData.severityLevel}
                onChange={handleFormChange}
                options={SEVERITY_LEVELS.map((level) => ({ value: level, label: level }))}
                placeholder="Select severity..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="area-select">Area</label>
              <SearchableSelect
                name="area"
                value={formData.area}
                onChange={handleFormChange}
                options={[{ value: '', label: 'Select Area' }, ...FACILITY_AREAS.map((a) => ({ value: a, label: a }))]}
                placeholder="Select area..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Submitting...' : (editingInspection ? '✓ Update' : '✓ Submit')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeForm}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inspections List */}
      <div className="inspections-list">
        <div className="section-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <h2 style={{ margin: 0 }}>Inspections ({inspections.length})</h2>
          <div className="header-buttons">
            {inspections.length > 0 && (
              <button
                className="btn-secondary"
                onClick={handleDownloadExcel}
                title="Download filtered inspections as Excel"
              >
                📥 Download Excel
              </button>
            )}

            {(filters.round || filters.horseId || filters.severityLevel || filters.area || filters.startDate || filters.endDate) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setFilters({
                    round: '',
                    horseId: '',
                    severityLevel: '',
                    area: '',
                    startDate: '',
                    endDate: '',
                  });
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {loading && <CardGridSkeleton count={6} withImage />}
        
        {!loading && inspections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <p style={{ color: '#999', marginBottom: '10px' }}>
              {Object.values(filters).some(v => v) 
                ? '❌ No inspections found with these filters' 
                : 'No inspections created yet'}
            </p>
          </div>
        )}

        {!loading && inspections.length > 0 && (
          <div className="inspections-grid">
            {inspections.map((inspection) => (
              <div key={inspection.id} className="inspection-card">
                <div className="card-header">
                  <div className="card-header-top">
                    <span className="round-badge">{inspection.round}</span>
                    <span className="severity-badge" style={{ backgroundColor: getSeverityColor(inspection.severityLevel) }}>
                      {inspection.severityLevel}
                    </span>
                  </div>
                  <p className="card-date">{formatDate(inspection.createdAt)}</p>
                </div>

                <div className="card-image" style={{ position: 'relative' }}>
                  <img src={inspection.images?.[0] || inspection.image} alt="Inspection" onError={(e) => { e.target.style.display = 'none'; }} />
                  {inspection.images?.length > 1 && (
                    <span className="insp-img-count">+{inspection.images.length - 1}</span>
                  )}
                </div>

                <div className="card-content">
                  <p><strong>Horse:</strong> {inspection.horse?.name || '-'}</p>
                  <p><strong>Location:</strong> {inspection.location}</p>
                  {inspection.area && <p><strong>Area:</strong> {inspection.area}</p>}
                  <p><strong>Description:</strong> {inspection.description}</p>
                  <p><strong>Reported By:</strong> {inspection.jamedar?.fullName}</p>
                  <p>
                    <strong>Case:</strong>{' '}
                    <span className={`status-badge ${inspection.status === 'Resolved' ? 'resolved' : 'open'}`}>
                      {t(inspection.status || 'Open')}
                    </span>
                  </p>
                </div>

                {(isJamedar || canViewAll) && (
                  <div className="card-actions">
                    <button
                      className="btn-view"
                      onClick={() => handleView(inspection)}
                      title="View Details"
                    >
                      👁
                    </button>
                    {isJamedar && isJamedar && (
                      <>
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(inspection)}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(inspection.id)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewingInspection && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('Inspection Details')}</h2>
              <button className="modal-close" onClick={closeViewModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="view-section">
                <div className="insp-img-gallery">
                  {(viewingInspection.images?.length ? viewingInspection.images : [viewingInspection.image]).filter(Boolean).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Inspection ${i + 1}`}
                      onClick={() => setFullScreenImage(url)}
                      style={{ cursor: 'pointer' }}
                      title="Click to expand"
                    />
                  ))}
                </div>

                <div className="view-details">
                  <div className="detail-row">
                    <label>Round:</label>
                    <span className="round-badge">{viewingInspection.round}</span>
                  </div>

                  <div className="detail-row">
                    <label>Severity:</label>
                    <span className="severity-badge" style={{ backgroundColor: getSeverityColor(viewingInspection.severityLevel) }}>
                      {viewingInspection.severityLevel}
                    </span>
                  </div>

                  <div className="detail-row">
                    <label>Date:</label>
                    <span>{formatDate(viewingInspection.createdAt)}</span>
                  </div>

                  <div className="detail-row">
                    <label>Time:</label>
                    <span>{new Date(viewingInspection.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="detail-row">
                    <label>Location:</label>
                    <span>{viewingInspection.location}</span>
                  </div>

                  <div className="detail-row">
                    <label>Area:</label>
                    <span>{viewingInspection.area || '-'}</span>
                  </div>

                  <div className="detail-row">
                    <label>Horse:</label>
                    <span>{viewingInspection.horse?.name || '-'}</span>
                  </div>

                  <div className="detail-row">
                    <label>Reported By:</label>
                    <span>{viewingInspection.jamedar?.fullName} ({t(viewingInspection.jamedar?.designation)})</span>
                  </div>

                  <div className="detail-row-full">
                    <label>Description:</label>
                    <p className="description-text">{viewingInspection.description}</p>
                  </div>

                  <div className="detail-row">
                    <label>Status:</label>
                    <span className={`status-badge ${viewingInspection.status === 'Resolved' ? 'resolved' : 'open'}`}>
                      {t(viewingInspection.status || 'Open')}
                    </span>
                  </div>

                  {viewingInspection.comments && (
                    <div className="detail-row-full">
                      <label>Comments:</label>
                      <p className="description-text">{viewingInspection.comments}</p>
                    </div>
                  )}

                  {viewingInspection.resolvedBy && (
                    <>
                      <div className="detail-row">
                        <label>Resolved By:</label>
                        <span>{viewingInspection.resolvedBy.fullName} ({t(viewingInspection.resolvedBy.designation)})</span>
                      </div>
                      <div className="detail-row">
                        <label>Resolved At:</label>
                        <span>{formatDate(viewingInspection.resolvedAt)}</span>
                      </div>
                      {viewingInspection.resolutionNotes && (
                        <div className="detail-row-full">
                          <label>Resolution Notes:</label>
                          <p className="description-text">{viewingInspection.resolutionNotes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {isJamedar && viewingInspection.jamedarId === user?.id && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    handleEdit(viewingInspection);
                    closeViewModal();
                  }}
                >
                  ✎ Edit
                </button>
              )}
              {['Stable Manager', 'School Administrator', 'Director'].includes(user?.designation) && viewingInspection.status === 'Open' && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setResolvingInspection(viewingInspection);
                    setResolveData({ comments: '', resolutionNotes: '' });
                    closeViewModal();
                  }}
                >
                  ✓ Resolve
                </button>
              )}
              <button className="btn-secondary" onClick={closeViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (
        <div className="fullscreen-image-overlay" onClick={closeFullScreenImage}>
          <div className="fullscreen-image-container" onClick={(e) => e.stopPropagation()}>
            <button className="fullscreen-close" onClick={closeFullScreenImage}>✕</button>
            <img src={fullScreenImage} alt="Full Screen Inspection" className="fullscreen-img" />
            <div className="fullscreen-controls">
              <p>Click anywhere or press ESC to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolvingInspection && (
        <div className="modal-overlay" onClick={() => setResolvingInspection(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('Resolve Inspection')}</h2>
              <button className="modal-close" onClick={() => setResolvingInspection(null)}>✕</button>
            </div>

            <form onSubmit={handleResolve}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Comments (max 500 characters)</label>
                  <textarea
                    name="comments"
                    value={resolveData.comments}
                    onChange={handleResolveDataChange}
                    placeholder="Add comments about this inspection..."
                    maxLength="500"
                    rows="3"
                  />
                  <small>{resolveData.comments.length}/500</small>
                </div>

                <div className="form-group">
                  <label>Resolution Notes (max 500 characters)</label>
                  <textarea
                    name="resolutionNotes"
                    value={resolveData.resolutionNotes}
                    onChange={handleResolveDataChange}
                    placeholder="Add resolution notes..."
                    maxLength="500"
                    rows="3"
                  />
                  <small>{resolveData.resolutionNotes.length}/500</small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setResolvingInspection(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : '✓ Resolve Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Inspection"
        message="Are you sure you want to delete this inspection?"
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default InspectionPage;
