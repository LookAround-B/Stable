import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { TableSkeleton } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Bell, BellOff, Send } from 'lucide-react';
import * as XLSX from 'xlsx';

const SHOEING_INTERVAL_DAYS = 21;

const getLocalDateTimeString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const FarrierShoeingPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [activeTab, setActiveTab] = useState('completed');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [records, setRecords] = useState([]);
  const [pendingHorses, setPendingHorses] = useState([]);
  const [horses, setHorses] = useState([]);
  const [farriers, setFarriers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [reminder, setReminder] = useState({ pendingCount: 0, isSnoozed: false, snoozedUntil: null, lastSent: null });
  const [reminderSending, setReminderSending] = useState(false);

  const [formData, setFormData] = useState({
    horseId: '',
    farrierId: '',
    shoeingDate: getLocalDateTimeString(),
    notes: '',
  });

  const showMsg = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/farrier-shoeing');
      setRecords(response.data.data || []);
    } catch (error) {
      console.error('Error loading shoeing records:', error);
      showMsg('Failed to load shoeing records', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPendingHorses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/farrier-shoeing?tab=pending');
      setPendingHorses(response.data.data || []);
    } catch (error) {
      console.error('Error loading pending horses:', error);
      showMsg('Failed to load pending horses', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHorses = useCallback(async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  }, []);

  const loadFarriers = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      const allEmployees = response.data.data || response.data || [];
      // Filter to farriers only, or show all staff if no farriers found
      const farrierList = allEmployees.filter((e) => e.designation === 'Farrier');
      setFarriers(farrierList.length > 0 ? farrierList : allEmployees);
    } catch (error) {
      console.error('Error loading farriers:', error);
    }
  }, []);

  useEffect(() => {
    loadHorses();
    loadFarriers();
    loadReminderStatus();
  }, [loadHorses, loadFarriers]);

  useEffect(() => {
    if (activeTab === 'completed') {
      loadRecords();
    } else {
      loadPendingHorses();
    }
  }, [activeTab, loadRecords, loadPendingHorses]);

  const calculateNextDue = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + SHOEING_INTERVAL_DAYS);
    return d.toLocaleDateString('en-GB');
  };

  // --- Reminder logic ---
  const loadReminderStatus = async () => {
    try {
      const response = await apiClient.get('/farrier-shoeing/reminders');
      setReminder(response.data);
    } catch (error) {
      console.error('Error loading reminder status:', error);
    }
  };

  const handleSendReminder = async () => {
    try {
      setReminderSending(true);
      const response = await apiClient.post('/farrier-shoeing/reminders', {});
      if (response.data.sent) {
        showMsg('✓ Reminder email sent successfully');
      } else {
        showMsg(response.data.message || 'No reminder sent', 'error');
      }
      loadReminderStatus();
    } catch (error) {
      showMsg('Failed to send reminder email', 'error');
    } finally {
      setReminderSending(false);
    }
  };

  const handleSnooze = async () => {
    try {
      setReminderSending(true);
      await apiClient.post('/farrier-shoeing/reminders', { action: 'snooze' });
      showMsg('✓ Reminder snoozed for 24 hours');
      loadReminderStatus();
    } catch (error) {
      showMsg('Failed to snooze reminder', 'error');
    } finally {
      setReminderSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.horseId || !formData.farrierId || !formData.shoeingDate) {
      showMsg('Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/farrier-shoeing', {
        horseId: formData.horseId,
        farrierId: formData.farrierId,
        shoeingDate: new Date(formData.shoeingDate).toISOString(),
        notes: formData.notes || '',
      });
      showMsg('✓ Shoeing record created successfully');
      setFormData({
        horseId: '',
        farrierId: '',
        shoeingDate: getLocalDateTimeString(),
        notes: '',
      });
      setShowForm(false);
      loadRecords();
      loadPendingHorses();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Failed to create shoeing record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      setLoading(true);
      await apiClient.delete('/farrier-shoeing', { data: { id } });
      showMsg('✓ Record deleted');
      loadRecords();
      loadPendingHorses();
    } catch (error) {
      showMsg('Failed to delete record', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick-shoe from pending tab
  const handleQuickShoe = (horseId) => {
    setFormData({
      horseId,
      farrierId: '',
      shoeingDate: getLocalDateTimeString(),
      notes: '',
    });
    setShowForm(true);
    setActiveTab('completed');
  };

  const handleDownloadExcel = () => {
    if (activeTab === 'completed') {
      if (!records.length) { alert('No data to download'); return; }
      const data = records.map((r) => ({
        'Horse': r.horse?.name || '',
        'Stable #': r.horse?.stableNumber || '',
        'Farrier': r.farrier?.fullName || '',
        'Shoeing Date': r.shoeingDate ? new Date(r.shoeingDate).toLocaleDateString('en-GB') : '',
        'Next Due Date': r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString('en-GB') : '',
        'Notes': r.notes || '',
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Completed Shoeings');
      XLSX.writeFile(wb, `FarrierShoeing_Completed_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      if (!pendingHorses.length) { alert('No data to download'); return; }
      const data = pendingHorses.map((p) => ({
        'Horse': p.horse?.name || '',
        'Stable #': p.horse?.stableNumber || '',
        'Last Shoeing': p.lastShoeingDate ? new Date(p.lastShoeingDate).toLocaleDateString('en-GB') : 'Never',
        'Next Due': p.nextDueDate ? new Date(p.nextDueDate).toLocaleDateString('en-GB') : 'N/A',
        'Days Overdue': p.neverShoed ? 'Never Shoed' : (p.daysOverdue || 0),
        'Last Farrier': p.farrier?.fullName || 'N/A',
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Pending Shoeings');
      XLSX.writeFile(wb, `FarrierShoeing_Pending_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  if (!user) return null;
  if (!p.viewFarrierShoeing) return <Navigate to="/" replace />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t('Farrier Shoeing')}</h1>
          <p>Manage horse shoeing schedule — every {SHOEING_INTERVAL_DAYS} days</p>
        </div>
        <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* Shoeing Reminder Notification Banner */}
      {reminder.pendingCount > 0 && (
        <div style={{
          background: reminder.isSnoozed ? '#fff3cd' : '#f8d7da',
          border: `1px solid ${reminder.isSnoozed ? '#ffc107' : '#f5c6cb'}`,
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Bell size={22} style={{ color: reminder.isSnoozed ? '#856404' : '#721c24', flexShrink: 0 }} />
            <div>
              <strong style={{ color: reminder.isSnoozed ? '#856404' : '#721c24' }}>
                {reminder.isSnoozed ? '🔕 Reminder Snoozed' : `⚠️ ${reminder.pendingCount} horse${reminder.pendingCount !== 1 ? 's' : ''} pending shoeing`}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
                {reminder.isSnoozed
                  ? `Snoozed until ${new Date(reminder.snoozedUntil).toLocaleString('en-GB')}`
                  : 'You have pending horse shoeing tasks. Please complete them.'}
              </p>
              {reminder.lastSent && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#999' }}>
                  Last reminder sent: {new Date(reminder.lastSent).toLocaleString('en-GB')}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleSendReminder}
              disabled={reminderSending || reminder.isSnoozed}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                background: '#dc3545', color: '#fff', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                opacity: (reminderSending || reminder.isSnoozed) ? 0.5 : 1,
              }}
            >
              <Send size={14} />
              {reminderSending ? 'Sending...' : 'Send Reminder'}
            </button>
            <button
              onClick={handleSnooze}
              disabled={reminderSending || reminder.isSnoozed}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc',
                background: '#fff', color: '#333', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                opacity: (reminderSending || reminder.isSnoozed) ? 0.5 : 1,
              }}
            >
              <BellOff size={14} />
              Snooze 24h
            </button>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          ✔ Completed Shoeings
        </button>
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending / Overdue
          {pendingHorses.length > 0 && (
            <span style={{
              marginLeft: '8px',
              backgroundColor: '#dc3545',
              color: '#fff',
              borderRadius: '50%',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {pendingHorses.length}
            </span>
          )}
        </button>
      </div>

      {/* Add New Shoeing Form */}
      {activeTab === 'completed' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)} disabled={loading}>
            {showForm ? '✕ Cancel' : '+ Record Shoeing'}
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="medicine-form" style={{ marginBottom: '24px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Horse *</label>
              <SearchableSelect
                value={formData.horseId}
                onChange={(e) => setFormData((prev) => ({ ...prev, horseId: e.target.value }))}
                placeholder="Search horse..."
                options={[
                  { value: '', label: 'Select Horse' },
                  ...horses.map((h) => ({ value: h.id, label: `${h.name}${h.stableNumber ? ` (${h.stableNumber})` : ''}` }))
                ]}
              />
            </div>

            <div className="form-group">
              <label>Farrier *</label>
              <SearchableSelect
                value={formData.farrierId}
                onChange={(e) => setFormData((prev) => ({ ...prev, farrierId: e.target.value }))}
                placeholder="Search farrier..."
                options={[
                  { value: '', label: 'Select Farrier' },
                  ...farriers.map((f) => ({ value: f.id, label: `${f.fullName} (${f.designation})` }))
                ]}
              />
            </div>

            <div className="form-group">
              <label>Shoeing Date & Time *</label>
              <input
                type="datetime-local"
                value={formData.shoeingDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, shoeingDate: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Next Due Date (auto)</label>
              <input
                type="text"
                value={calculateNextDue(formData.shoeingDate)}
                disabled
                style={{ backgroundColor: '#f0f0f0' }}
              />
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any notes about the shoeing..."
                rows="2"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Shoeing Record'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <div>
          {loading && <TableSkeleton cols={6} rows={5} />}

          {!loading && records.length > 0 ? (
            <div className="table-wrapper">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Horse</th>
                    <th>Stable #</th>
                    <th>Farrier</th>
                    <th>Shoeing Date</th>
                    <th>Next Due Date</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const now = new Date();
                    const nextDue = new Date(record.nextDueDate);
                    const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    let statusBadge;
                    if (daysUntilDue < 0) {
                      statusBadge = (
                        <span style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                          Overdue ({Math.abs(daysUntilDue)}d)
                        </span>
                      );
                    } else if (daysUntilDue <= 5) {
                      statusBadge = (
                        <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                          Due Soon ({daysUntilDue}d)
                        </span>
                      );
                    } else {
                      statusBadge = (
                        <span style={{ backgroundColor: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                          OK ({daysUntilDue}d left)
                        </span>
                      );
                    }

                    return (
                      <tr key={record.id}>
                        <td><strong>{record.horse?.name || 'Unknown'}</strong></td>
                        <td>{record.horse?.stableNumber || '—'}</td>
                        <td>{record.farrier?.fullName || 'Unknown'}</td>
                        <td>{new Date(record.shoeingDate).toLocaleDateString('en-GB')}</td>
                        <td>{new Date(record.nextDueDate).toLocaleDateString('en-GB')}</td>
                        <td>{statusBadge}</td>
                        <td>{record.notes || '—'}</td>
                        <td>
                          <button className="btn-delete" onClick={() => handleDelete(record.id)} disabled={loading}>
                            ✕ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <p className="no-data">No shoeing records yet</p>
          )}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div>
          {loading && <TableSkeleton cols={5} rows={5} />}

          {!loading && pendingHorses.length > 0 ? (
            <div className="table-wrapper">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Horse</th>
                    <th>Stable #</th>
                    <th>Last Shoeing</th>
                    <th>Next Due</th>
                    <th>Overdue</th>
                    <th>Last Farrier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingHorses.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.horse?.name || 'Unknown'}</strong></td>
                      <td>{item.horse?.stableNumber || '—'}</td>
                      <td>
                        {item.neverShoed
                          ? <span style={{ color: '#dc3545', fontWeight: 600 }}>Never Shoed</span>
                          : new Date(item.lastShoeingDate).toLocaleDateString('en-GB')
                        }
                      </td>
                      <td>
                        {item.nextDueDate
                          ? new Date(item.nextDueDate).toLocaleDateString('en-GB')
                          : '—'
                        }
                      </td>
                      <td>
                        {item.neverShoed ? (
                          <span style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                            Never Shoed
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                            {item.daysOverdue} day{item.daysOverdue !== 1 ? 's' : ''} overdue
                          </span>
                        )}
                      </td>
                      <td>{item.farrier?.fullName || '—'}</td>
                      <td>
                        <button
                          className="btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => handleQuickShoe(item.horse?.id)}
                        >
                          🔨 Shoe Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && <p className="no-data" style={{ color: '#155724' }}>All horses are up to date on shoeing!</p>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Record"
        message="Are you sure you want to delete this shoeing record?"
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default FarrierShoeingPage;
