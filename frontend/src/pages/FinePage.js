import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import fineService from '../services/fineService';
import '../styles/FinePage.css';

const STATUS_OPTIONS = ['Open', 'Resolved', 'Dismissed'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const AUTHORIZED_ROLES = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Jamedar'];

const FinePage = () => {
  const { user } = useAuth();
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewingFine, setViewingFine] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [resolvingFine, setResolvingFine] = useState(null);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    issuedToId: '',
    reason: '',
    evidenceImage: null,
  });

  // Resolve form
  const [resolveData, setResolveData] = useState({
    status: 'Resolved',
    resolutionNotes: '',
  });

  // Check if user can issue fines
  const canIssueFines = useMemo(() => AUTHORIZED_ROLES.includes(user?.designation), [user?.designation]);

  const loadFines = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading fines with filters:', filters);
      const data = await fineService.getAllFines(filters);
      console.log('Fines data received:', data);
      setFines(data.fines || []);
    } catch (error) {
      console.error('✗ Error loading fines:', error);
      setMessage(`✗ Error loading fines: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadEmployees = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://horsestablebackend.vercel.app/api';
      const token = localStorage.getItem('token');
      console.log('Loading employees from:', `${apiUrl}/employees`);

      const response = await fetch(`${apiUrl}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load employees: ${response.status}`);
      }

      const responseData = await response.json();
      const employeesData = Array.isArray(responseData) ? responseData : (responseData.data || []);
      console.log('Parsed employees:', employeesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    loadFines();
    loadEmployees();
  }, [loadFines, loadEmployees]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        setFullScreenImage(null);
        setViewingFine(null);
        setResolvingFine(null);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'evidenceImage' && files.length > 0) {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }
      setFormData((prev) => ({ ...prev, evidenceImage: file }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleResolveDataChange = (e) => {
    const { name, value } = e.target;
    setResolveData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.issuedToId) {
      setMessage('✗ Please select an employee');
      return;
    }
    if (!formData.reason.trim()) {
      setMessage('✗ Please enter a reason');
      return;
    }
    if (formData.reason.length > 500) {
      setMessage('✗ Reason cannot exceed 500 characters');
      return;
    }
    if (!formData.evidenceImage) {
      setMessage('✗ Please upload evidence image');
      return;
    }

    try {
      setLoading(true);
      setMessage('Processing...');
      console.log('Submitting fine form...');

      const data = await fineService.issueFine(formData);
      console.log('Fine created:', data);

      setMessage('✓ Fine issued successfully');
      setFormData({
        issuedToId: '',
        reason: '',
        evidenceImage: null,
      });
      
      // Clear file input
      const fileInput = document.querySelector('input[name="evidenceImage"]');
      if (fileInput) fileInput.value = '';
      
      // Refresh the list
      loadFines();
    } catch (error) {
      console.error('❌ Error issuing fine:', error);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFine = async (e) => {
    e.preventDefault();

    if (!resolvingFine) return;

    try {
      setLoading(true);
      setMessage('Processing...');
      console.log('Resolving fine:', resolvingFine.id);

      const data = await fineService.updateFineStatus(
        resolvingFine.id,
        resolveData.status,
        resolveData.resolutionNotes
      );
      console.log('Fine updated:', data);

      setMessage('✓ Fine status updated successfully');
      setResolvingFine(null);
      setResolveData({
        status: 'Resolved',
        resolutionNotes: '',
      });

      // Refresh the list
      loadFines();
    } catch (error) {
      console.error('❌ Error updating fine:', error);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFine = async (fineId) => {
    if (!window.confirm('Are you sure you want to delete this fine?')) return;

    try {
      setLoading(true);
      console.log('Deleting fine:', fineId);
      await fineService.deleteFine(fineId);
      setMessage('✓ Fine deleted successfully');
      loadFines();
    } catch (error) {
      console.error('❌ Error deleting fine:', error);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return '#f39c12';
      case 'Resolved':
        return '#2ecc71';
      case 'Dismissed':
        return '#95a5a6';
      default:
        return '#95a5a6';
    }
  };

  return (
    <div className="fine-page">
      <div className="fine-header">
        <h1>Fine System</h1>
        {canIssueFines && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Issue Fine'}
          </button>
        )}
      </div>

      {message && <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>{message}</div>}

      {/* Issue Fine Form */}
      {canIssueFines && showForm && (
        <div className="fine-form-section">
          <h2>Issue New Fine</h2>
          <form onSubmit={handleSubmitForm}>
            <div className="form-group">
              <label>Employee</label>
              <select
                name="issuedToId"
                value={formData.issuedToId}
                onChange={handleFormChange}
                required
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.designation})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Reason for Fine (max 500 characters)</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleFormChange}
                placeholder="Describe the reason for issuing this fine..."
                maxLength="500"
                rows="4"
                required
              />
              <small>{formData.reason.length}/500</small>
            </div>

            <div className="form-group">
              <label>Evidence Image (Required)</label>
              <input
                type="file"
                name="evidenceImage"
                onChange={handleFormChange}
                accept="image/*"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing...' : '✓ Issue Fine'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Fines List */}
      <div className="fines-list-section">
        <h2>Fines ({fines.length})</h2>
        {loading && <p>Loading...</p>}
        {!loading && fines.length === 0 && <p>No fines found</p>}

        <div className="fines-table-container">
          <table className="fines-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Issued To</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fines.map((fine) => (
                <tr key={fine.id}>
                  <td>{formatDate(fine.createdAt)}</td>
                  <td>{fine.issuedTo?.fullName}</td>
                  <td>{fine.reason.substring(0, 50)}...</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(fine.status) }}
                    >
                      {fine.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-link"
                      onClick={() => setFullScreenImage(fine.evidenceImage)}
                    >
                      View
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn-link"
                      onClick={() => setViewingFine(fine)}
                    >
                      Details
                    </button>
                    {canIssueFines && fine.status === 'Open' && (
                      <>
                        {' | '}
                        <button
                          className="btn-link"
                          onClick={() => {
                            setResolvingFine(fine);
                            setResolveData({
                              status: 'Resolved',
                              resolutionNotes: '',
                            });
                          }}
                        >
                          Resolve
                        </button>
                      </>
                    )}
                    {canIssueFines && (fine.issuedById === user?.id || user?.designation === 'Director' || user?.designation === 'School Administrator') && (
                      <>
                        {' | '}
                        <button
                          className="btn-link btn-danger"
                          onClick={() => handleDeleteFine(fine.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (
        <div className="full-screen-image-viewer" onClick={() => setFullScreenImage(null)}>
          <div className="close-button" onClick={() => setFullScreenImage(null)}>
            ✕
          </div>
          <img src={fullScreenImage} alt="Evidence" />
        </div>
      )}

      {/* Fine Details Modal */}
      {viewingFine && (
        <div className="modal-overlay" onClick={() => setViewingFine(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Fine Details</h2>
              <button className="btn-close" onClick={() => setViewingFine(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <label>Date Issued:</label>
                <p>{formatDate(viewingFine.createdAt)}</p>
              </div>
              <div className="detail-group">
                <label>Issued By:</label>
                <p>{viewingFine.issuedBy?.fullName}</p>
              </div>
              <div className="detail-group">
                <label>Issued To:</label>
                <p>{viewingFine.issuedTo?.fullName}</p>
              </div>
              <div className="detail-group">
                <label>Reason:</label>
                <p>{viewingFine.reason}</p>
              </div>
              <div className="detail-group">
                <label>Status:</label>
                <p>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(viewingFine.status) }}
                  >
                    {viewingFine.status}
                  </span>
                </p>
              </div>
              {viewingFine.resolvedBy && (
                <>
                  <div className="detail-group">
                    <label>Resolved By:</label>
                    <p>{viewingFine.resolvedBy?.fullName}</p>
                  </div>
                  <div className="detail-group">
                    <label>Resolution Notes:</label>
                    <p>{viewingFine.resolutionNotes}</p>
                  </div>
                </>
              )}
              <div className="detail-group">
                <label>Evidence Image:</label>
                <img
                  src={viewingFine.evidenceImage}
                  alt="Evidence"
                  className="detail-image"
                  onClick={() => setFullScreenImage(viewingFine.evidenceImage)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Fine Modal */}
      {resolvingFine && (
        <div className="modal-overlay" onClick={() => setResolvingFine(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Resolve Fine</h2>
              <button className="btn-close" onClick={() => setResolvingFine(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleResolveFine}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={resolveData.status}
                    onChange={handleResolveDataChange}
                    required
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="Dismissed">Dismissed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Resolution Notes (optional)</label>
                  <textarea
                    name="resolutionNotes"
                    value={resolveData.resolutionNotes}
                    onChange={handleResolveDataChange}
                    placeholder="Add any notes about the resolution..."
                    maxLength="500"
                    rows="3"
                  />
                  <small>{resolveData.resolutionNotes.length}/500</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setResolvingFine(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : '✓ Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinePage;
