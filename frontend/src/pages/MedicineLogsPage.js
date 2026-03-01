import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import medicineLogService from '../services/medicineLogService';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import '../styles/MedicineLogsPage.css';

const MedicineLogsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [logs, setLogs] = useState([]);
  const [horses, setHorses] = useState([]);
  const [selectedTab, setSelectedTab] = useState('my-logs'); // 'my-logs', 'pending-approval'
  const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);

  const [formData, setFormData] = useState({
    horseId: '',
    medicineName: '',
    quantity: '',
    unit: 'ml',
    timeAdministered: new Date().toISOString().slice(0, 16),
    notes: '',
    photoUrl: '', // URL or base64
  });

  const UNITS = ['ml', 'g', 'tablets', 'vials', 'bottles', 'injections'];

  const canApprove = ['Stable Manager', 'Director', 'Super Admin', 'School Administrator'].includes(user?.designation);
  const isJamedar = user?.designation === 'Jamedar';

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      if (selectedTab === 'my-logs' && isJamedar) {
        response = await medicineLogService.getMyMedicineLogs();
      } else if (selectedTab === 'pending-approval' && canApprove) {
        response = await medicineLogService.getPendingMedicineLogs();
      } else {
        response = await medicineLogService.getMedicineLogs();
      }
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      showMessage('Failed to load medicine logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTab, isJamedar, canApprove]);

  const loadHorses = useCallback(async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  }, []);

  useEffect(() => {
    loadHorses();
    loadLogs();
  }, [loadHorses, loadLogs]);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          photoUrl: event.target.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (!formData.horseId || !formData.medicineName || !formData.quantity) {
        showMessage('Please fill in all required fields', 'error');
        return;
      }

      const submitData = {
        horseId: formData.horseId,
        medicineName: formData.medicineName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        timeAdministered: new Date(formData.timeAdministered).toISOString(),
        notes: formData.notes || '',
        photoUrl: formData.photoUrl || '',
      };

      await medicineLogService.createMedicineLog(submitData);
      showMessage('✓ Medicine log created successfully');
      
      setFormData({
        horseId: '',
        medicineName: '',
        quantity: '',
        unit: 'ml',
        timeAdministered: new Date().toISOString().slice(0, 16),
        notes: '',
        photoUrl: '',
      });
      setShowForm(false);
      loadLogs();
    } catch (error) {
      showMessage(error.message || 'Failed to create medicine log', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        setLoading(true);
        await medicineLogService.deleteMedicineLog(id);
        showMessage('Record deleted successfully');
        loadLogs();
      } catch (error) {
        showMessage('Failed to delete record', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      await medicineLogService.approveMedicineLog(id, 'Approved by ' + user.fullName);
      showMessage('✓ Medicine log approved');
      loadLogs();
    } catch (error) {
      showMessage('Failed to approve record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      setLoading(true);
      await medicineLogService.rejectMedicineLog(id, reason);
      showMessage('✓ Medicine log rejected');
      loadLogs();
    } catch (error) {
      showMessage('Failed to reject record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: '#fff3cd', text: '#856404', label: '⏳ Pending' },
      approved: { bg: '#d4edda', text: '#155724', label: '✓ Approved' },
      rejected: { bg: '#f8d7da', text: '#721c24', label: '✕ Rejected' },
    };
    const config = statusConfig[status] || { bg: '#e2e3e5', text: '#383d41', label: status };
    return (
      <span style={{ backgroundColor: config.bg, color: config.text, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
        {config.label}
      </span>
    );
  };

  const horseMap = horses.reduce((acc, horse) => {
    acc[horse.id] = horse.name;
    return acc;
  }, {});

  if (!user) return null;

  // Jamedar can only create logs
  // Stable Manager and above can approve/reject
  if (!isJamedar && !canApprove) {
    return (
      <div className="page-container">
        <div className="error-message">
          You do not have permission to access this page. Only Jamedar and Stable Manager can access medicine logs.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💊 Medicine Logs</h1>
        <p>Track medicine administration and approvals</p>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      <div className="tabs">
        {isJamedar && (
          <button
            className={`tab-button ${selectedTab === 'my-logs' ? 'active' : ''}`}
            onClick={() => setSelectedTab('my-logs')}
          >
            📝 My Logs
          </button>
        )}
        {canApprove && (
          <button
            className={`tab-button ${selectedTab === 'pending-approval' ? 'active' : ''}`}
            onClick={() => setSelectedTab('pending-approval')}
          >
            ⏳ Pending Approval
          </button>
        )}
      </div>

      {selectedTab === 'my-logs' && isJamedar && (
        <div className="my-logs-section">
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
            disabled={loading}
          >
            {showForm ? '✕ Cancel' : '+ Add Medicine Log'}
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} className="medicine-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Horse *</label>
                  <SearchableSelect
                    options={horses}
                    getDisplayText={(horse) => horse.name}
                    getValue={(horse) => horse.id}
                    selectedValue={formData.horseId}
                    onSelect={(horse) => setFormData((prev) => ({ ...prev, horseId: horse.id }))}
                    placeholder="Search horse..."
                  />
                </div>

                <div className="form-group">
                  <label>Medicine Name *</label>
                  <input
                    type="text"
                    name="medicineName"
                    value={formData.medicineName}
                    onChange={handleFormChange}
                    placeholder="e.g., Antibiotic, Painkiller"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <select name="unit" value={formData.unit} onChange={handleFormChange}>
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Time Administered *</label>
                  <input
                    type="datetime-local"
                    name="timeAdministered"
                    value={formData.timeAdministered}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Any additional notes about the medication..."
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Treatment Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                  {formData.photoUrl && (
                    <div className="photo-preview">
                      <img src={formData.photoUrl} alt="Preview" style={{ maxWidth: '150px', maxHeight: '150px', marginTop: '10px' }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Log'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={loading}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading && <div className="loading">Loading...</div>}

          {!loading && logs.length > 0 ? (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Horse</th>
                  <th>Medicine</th>
                  <th>Quantity</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{horseMap[log.horseId] || 'Unknown'}</td>
                    <td>{log.medicineName}</td>
                    <td>{log.quantity} {log.unit}</td>
                    <td>{new Date(log.timeAdministered).toLocaleString()}</td>
                    <td>{getStatusBadge(log.approvalStatus)}</td>
                    <td className="actions">
                      {log.approvalStatus === 'pending' && (
                        <>
                          <button className="btn-edit" onClick={() => setSelectedLogForDetail(log)} disabled={loading}>
                            ✎ Edit
                          </button>
                          <button className="btn-delete" onClick={() => handleDelete(log.id)} disabled={loading}>
                            ✕ Delete
                          </button>
                        </>
                      )}
                      <button className="btn-view" onClick={() => setSelectedLogForDetail(log)}>
                        👁 View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !loading && <p className="no-data">No medicine logs yet</p>
          )}
        </div>
      )}

      {selectedTab === 'pending-approval' && canApprove && (
        <div className="approval-section">
          {loading && <div className="loading">Loading...</div>}

          {!loading && logs.length > 0 ? (
            <div className="pending-logs">
              {logs.map((log) => (
                <div key={log.id} className="log-card">
                  <div className="card-header">
                    <h3>{horseMap[log.horseId] || 'Unknown Horse'}</h3>
                    {getStatusBadge(log.approvalStatus)}
                  </div>
                  <div className="card-body">
                    <p><strong>Medicine:</strong> {log.medicineName}</p>
                    <p><strong>Quantity:</strong> {log.quantity} {log.unit}</p>
                    <p><strong>Time:</strong> {new Date(log.timeAdministered).toLocaleString()}</p>
                    <p><strong>Logged by:</strong> {log.jamedar?.fullName || 'Unknown'}</p>
                    {log.notes && <p><strong>Notes:</strong> {log.notes}</p>}
                    {log.photoUrl && (
                      <div className="photo-section">
                        <img src={log.photoUrl} alt="Treatment" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                      </div>
                    )}
                  </div>
                  <div className="card-actions">
                    <button className="btn-approve" onClick={() => handleApprove(log.id)} disabled={loading}>
                      ✓ Approve
                    </button>
                    <button className="btn-reject" onClick={() => handleReject(log.id)} disabled={loading}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && <p className="no-data">No pending medicine logs for approval</p>
          )}
        </div>
      )}

      {selectedLogForDetail && (
        <div className="modal-overlay" onClick={() => setSelectedLogForDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Medicine Log Details</h3>
              <button className="btn-close" onClick={() => setSelectedLogForDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Horse:</strong> {horseMap[selectedLogForDetail.horseId] || 'Unknown'}</p>
              <p><strong>Medicine:</strong> {selectedLogForDetail.medicineName}</p>
              <p><strong>Quantity:</strong> {selectedLogForDetail.quantity} {selectedLogForDetail.unit}</p>
              <p><strong>Time:</strong> {new Date(selectedLogForDetail.timeAdministered).toLocaleString()}</p>
              <p><strong>Status:</strong> {getStatusBadge(selectedLogForDetail.approvalStatus)}</p>
              <p><strong>Logged by:</strong> {selectedLogForDetail.jamedar?.fullName || 'Unknown'}</p>
              {selectedLogForDetail.approvedBy && <p><strong>Approved by:</strong> {selectedLogForDetail.approvedBy.fullName}</p>}
              {selectedLogForDetail.rejectionReason && <p><strong>Rejection Reason:</strong> {selectedLogForDetail.rejectionReason}</p>}
              {selectedLogForDetail.notes && <p><strong>Notes:</strong> {selectedLogForDetail.notes}</p>}
              {selectedLogForDetail.photoUrl && (
                <div style={{ marginTop: '15px' }}>
                  <strong>Treatment Photo:</strong>
                  <img src={selectedLogForDetail.photoUrl} alt="Treatment" style={{ maxWidth: '300px', maxHeight: '300px', marginTop: '10px', display: 'block' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineLogsPage;
