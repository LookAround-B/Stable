import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import inspectionService from '../services/inspectionService';
import '../styles/InspectionPage.css';
import * as XLSX from 'xlsx';

const InspectionPage = () => {
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [resolvingInspection, setResolvingInspection] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [message, setMessage] = useState('');
  const [horses, setHorses] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    round: '',
    horseId: '',
    severityLevel: '',
    startDate: '',
    endDate: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    round: 'Morning',
    description: '',
    horseId: '',
    location: '',
    severityLevel: 'Low',
    image: null,
  });

  // Resolve form data
  const [resolveData, setResolveData] = useState({
    comments: '',
    resolutionNotes: '',
  });

  const ROUNDS = ['Morning', 'Afternoon', 'Evening'];
  const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
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
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setMessage(`✗ File size exceeds 5MB limit`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage(`✗ Please select an image file`);
      return;
    }

    console.log(`📸 Image selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    setFormData(prev => ({
      ...prev,
      image: file,
    }));
  };

  const handleEdit = (inspection) => {
    console.log('✎ Editing inspection:', inspection.id);
    setEditingInspection(inspection);
    setFormData({
      round: inspection.round,
      description: inspection.description,
      horseId: inspection.horseId || '',
      location: inspection.location,
      severityLevel: inspection.severityLevel,
      image: inspection.image, // Keep existing image URL
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inspection?')) return;

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
      severityLevel: 'Low',
      image: null,
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

    if (!formData.round || !formData.description || !formData.location || !formData.severityLevel || !formData.image) {
      setMessage('✗ All fields are required, including an image');
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

  return (
    <div className="inspection-page">
      <div className="inspection-header">
        <h1>Jamedar Inspection Rounds</h1>
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
          <select name="round" value={filters.round} onChange={handleFilterChange}>
            <option value="">All Rounds</option>
            {ROUNDS.map((round) => (
              <option key={round} value={round}>
                {round}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Horse</label>
          <select name="horseId" value={filters.horseId} onChange={handleFilterChange}>
            <option value="">All Horses</option>
            {horses.map((horse) => (
              <option key={horse.id} value={horse.id}>
                {horse.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Severity</label>
          <select name="severityLevel" value={filters.severityLevel} onChange={handleFilterChange}>
            <option value="">All Severity Levels</option>
            {SEVERITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
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
          <h2>{editingInspection ? 'Edit Inspection' : 'Report Issue'}</h2>
          <form onSubmit={handleSubmit} className="inspection-form">
            <div className="form-group">
              <label htmlFor="round-select">Round *</label>
              <select
                id="round-select"
                name="round"
                value={formData.round}
                onChange={handleFormChange}
                required
              >
                {ROUNDS.map((round) => (
                  <option key={round} value={round}>
                    {round}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="image-input">Image * (Mandatory)</label>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required
              />
              {formData.image && typeof formData.image === 'object' && (
                <p className="file-info">📸 {formData.image.name}</p>
              )}
              {formData.image && typeof formData.image === 'string' && (
                <p className="file-info">📎 Existing image: {formData.image.split('/').pop()}</p>
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
              <select
                id="horse-select"
                name="horseId"
                value={formData.horseId}
                onChange={handleFormChange}
              >
                <option value="">Select Horse</option>
                {horses.map((horse) => (
                  <option key={horse.id} value={horse.id}>
                    {horse.name}
                  </option>
                ))}
              </select>
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
              <select
                id="severity-select"
                name="severityLevel"
                value={formData.severityLevel}
                onChange={handleFormChange}
                required
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>Inspections ({inspections.length})</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {inspections.length > 0 && (
              <button
                className="btn-primary"
                onClick={handleDownloadExcel}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                title="Download filtered inspections as Excel"
              >
                📥 Download Excel
              </button>
            )}
            {(filters.round || filters.horseId || filters.severityLevel || filters.startDate || filters.endDate) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setFilters({
                    round: '',
                    horseId: '',
                    severityLevel: '',
                    startDate: '',
                    endDate: '',
                  });
                }}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#666' }}>⏳ Loading inspections...</p>}
        
        {!loading && inspections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <p style={{ color: '#999', marginBottom: '10px' }}>
              {Object.values(filters).some(v => v) 
                ? '❌ No inspections found with these filters' 
                : '📭 No inspections created yet'}
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

                <div className="card-image">
                  <img src={inspection.image} alt="Inspection" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>

                <div className="card-content">
                  <p><strong>Horse:</strong> {inspection.horse?.name || '-'}</p>
                  <p><strong>Location:</strong> {inspection.location}</p>
                  <p><strong>Description:</strong> {inspection.description}</p>
                  <p><strong>Reported By:</strong> {inspection.jamedar?.fullName}</p>
                  <p>
                    <strong>Case:</strong>{' '}
                    <span className={`status-badge ${inspection.status === 'Resolved' ? 'resolved' : 'open'}`}>
                      {inspection.status || 'Open'}
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
              <h2>Inspection Details</h2>
              <button className="modal-close" onClick={closeViewModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="view-section">
                <div className="view-image">
                  <img 
                    src={viewingInspection.image} 
                    alt="Inspection" 
                    onClick={() => setFullScreenImage(viewingInspection.image)}
                    style={{ cursor: 'pointer' }}
                    title="Click to expand"
                  />
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
                    <label>Horse:</label>
                    <span>{viewingInspection.horse?.name || '-'}</span>
                  </div>

                  <div className="detail-row">
                    <label>Reported By:</label>
                    <span>{viewingInspection.jamedar?.fullName} ({viewingInspection.jamedar?.designation})</span>
                  </div>

                  <div className="detail-row-full">
                    <label>Description:</label>
                    <p className="description-text">{viewingInspection.description}</p>
                  </div>

                  <div className="detail-row">
                    <label>Status:</label>
                    <span className={`status-badge ${viewingInspection.status === 'Resolved' ? 'resolved' : 'open'}`}>
                      {viewingInspection.status || 'Open'}
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
                        <span>{viewingInspection.resolvedBy.fullName} ({viewingInspection.resolvedBy.designation})</span>
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
              <h2>Resolve Inspection</h2>
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
    </div>
  );
};

export default InspectionPage;
