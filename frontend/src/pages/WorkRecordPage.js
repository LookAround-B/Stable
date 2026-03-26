import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const WorkRecordPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  
  // Staff categories
  const STAFF_CATEGORIES = {
    office: {
      label: 'Office',
      roles: ['Executive Admin', 'Senior Executive Admin', 'Junior Admin', 'Executive Accounts', 'Senior Executive Accounts', 'Junior Accounts']
    },
    instructors: {
      label: 'Instructors',
      roles: ['Instructor']
    },
    riders: {
      label: 'Riders',
      roles: ['Rider']
    },
    ridingBoys: {
      label: 'Riding Boys',
      roles: ['Riding Boy']
    },
    jamedars: {
      label: 'Jamedars',
      roles: ['Jamedar']
    }
  };

  const [workRecords, setWorkRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('office');
  const [filterStaffId, setFilterStaffId] = useState('all');

  const [newWorkRecord, setNewWorkRecord] = useState({
    staffId: '',
    entries: [
      {
        taskDescription: '',
        amHours: 0,
        pmHours: 0,
        wholeDayHours: 0,
        remarks: '',
      },
    ],
    remarks: '',
  });

  const getStaffByCategory = (category) => {
    const categoryInfo = STAFF_CATEGORIES[category];
    if (!categoryInfo) return [];
    return employees.filter((e) => categoryInfo.roles.includes(e.designation));
  };

  const loadWorkRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date: selectedDate };
      if (filterStaffId !== 'all') {
        params.staffId = filterStaffId;
      }

      const response = await apiClient.get('/work-records', { params });
      setWorkRecords(response.data.data || []);
      setMessage('');
    } catch (error) {
      console.error('Error loading work records:', error);
      setMessage('Failed to load work records');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterStaffId]);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  useEffect(() => {
    loadWorkRecords();
    loadEmployees();
  }, [selectedDate, filterStaffId, loadWorkRecords, loadEmployees]);

  const handleAddEntry = () => {
    setNewWorkRecord({
      ...newWorkRecord,
      entries: [
        ...newWorkRecord.entries,
        {
          taskDescription: '',
          amHours: 0,
          pmHours: 0,
          wholeDayHours: 0,
          remarks: '',
        },
      ],
    });
  };

  const handleRemoveEntry = (index) => {
    setNewWorkRecord({
      ...newWorkRecord,
      entries: newWorkRecord.entries.filter((_, i) => i !== index),
    });
  };

  const handleEntryChange = (index, field, value) => {
    const updatedEntries = [...newWorkRecord.entries];
    updatedEntries[index][field] = value;

    // Calculate whole day hours
    if (field === 'amHours' || field === 'pmHours') {
      updatedEntries[index].wholeDayHours = Number(updatedEntries[index].amHours) + Number(updatedEntries[index].pmHours);
    }

    setNewWorkRecord({
      ...newWorkRecord,
      entries: updatedEntries,
    });
  };

  const handleSubmitWorkRecord = async (e) => {
    e.preventDefault();

    if (!newWorkRecord.staffId || newWorkRecord.entries.length === 0) {
      setMessage('Please select a staff member and add at least one task entry');
      return;
    }

    const hasEmptyTask = newWorkRecord.entries.some((e) => !e.taskDescription);
    if (hasEmptyTask) {
      setMessage('Please enter a task description for all entries');
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

      const response = await apiClient.post('/work-records', payload);
      setWorkRecords([...workRecords, response.data.data]);
      setNewWorkRecord({
        staffId: '',
        entries: [
          {
            taskDescription: '',
            amHours: 0,
            pmHours: 0,
            wholeDayHours: 0,
            remarks: '',
          },
        ],
        remarks: '',
      });
      setShowAddForm(false);
      setMessage('Work record created successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating work record:', error);
      setMessage('Failed to create work record');
    } finally {
      setLoading(false);
    }
  };

  const getStaffName = (id) => {
    const staff = employees.find((e) => e.id === id);
    return staff ? staff.fullName : 'Unknown';
  };

  const canCreateWorkRecord = [
    'Super Admin',
    'Director',
    'School Administrator',
    'Stable Manager',
    'Executive Admin',
    'Senior Executive Admin',
  ].includes(user?.designation);

  const handleDownloadExcel = () => {
    if (!workRecords.length) { alert('No data to download'); return; }
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
    if (!rows.length) { alert('No data to download'); return; }
    const wb = XLSX.utils.book_new();
    const wsSheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsSheet, 'Work Record');
    XLSX.writeFile(wb, `WorkRecord_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (!p.viewGroomWorksheet) return <Navigate to="/dashboard" replace />;

  return (
    <div className="groom-worksheet-page">
      <div className="page-header">
        <div>
          <h1>{t('Work Record')}</h1>
          <p className="info-text">Track work activities and hours for office, instructors, riders, riding boys, and jamedar staff.</p>
        </div>
        <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
      </div>

      {message && <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

      <div className="worksheet-header">
        <div className="header-left">
          <label style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            Select Date:
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>

          <div style={{ minWidth: '250px' }}>
            <SearchableSelect
              value={filterStaffId}
              onChange={(e) => setFilterStaffId(e.target.value)}
              placeholder="All Staff"
              options={[
                { value: 'all', label: 'All Staff' },
                ...getStaffByCategory(selectedCategory).map(s => ({ value: s.id, label: s.fullName }))
              ]}
            />
          </div>
        </div>

        {canCreateWorkRecord && (
          <button className="btn-add-worksheet" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ Cancel' : '+ New Record'}
          </button>
        )}
      </div>

      {/* Add Work Record Form */}
      {showAddForm && canCreateWorkRecord && (
        <div className="add-worksheet-form">
          <h3>Create New Work Record</h3>
          <form onSubmit={handleSubmitWorkRecord}>
            <div className="form-row">
              <div className="form-group">
                <label>Staff Category *</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setFilterStaffId('all');
                    setNewWorkRecord({ ...newWorkRecord, staffId: '' });
                  }}
                  className="form-select"
                >
                  {Object.entries(STAFF_CATEGORIES).map(([key, category]) => (
                    <option key={key} value={key}>{t(category.label)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Staff Member *</label>
                <SearchableSelect
                  value={newWorkRecord.staffId}
                  onChange={(e) => setNewWorkRecord({ ...newWorkRecord, staffId: e.target.value })}
                  placeholder="Select Staff"
                  required
                  options={[
                    { value: '', label: 'Select Staff' },
                    ...getStaffByCategory(selectedCategory).map(s => ({ value: s.id, label: s.fullName }))
                  ]}
                />
              </div>

              <div className="form-group">
                <label>Overall Remarks</label>
                <textarea
                  value={newWorkRecord.remarks}
                  onChange={(e) => setNewWorkRecord({ ...newWorkRecord, remarks: e.target.value })}
                  placeholder="General notes for the day..."
                  rows="2"
                />
              </div>
            </div>

            <div className="entries-section">
              <div className="entries-header">
                <h4>Task Entries</h4>
              </div>

              {newWorkRecord.entries.map((entry, index) => (
                <div key={index} className="entry-card">
                  <div className="entry-header">
                    <h5>Task {index + 1}</h5>
                    {newWorkRecord.entries.length > 1 && (
                      <button type="button" className="btn-remove" onClick={() => handleRemoveEntry(index)}>
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="entry-form">
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>Task Description *</label>
                        <input
                          type="text"
                          value={entry.taskDescription}
                          onChange={(e) => handleEntryChange(index, 'taskDescription', e.target.value)}
                          placeholder="Enter task description..."
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Morning Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={entry.amHours}
                          onChange={(e) => handleEntryChange(index, 'amHours', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Afternoon/Evening Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={entry.pmHours}
                          onChange={(e) => handleEntryChange(index, 'pmHours', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Total Hours</label>
                        <input type="number" value={entry.wholeDayHours} disabled />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>Remarks</label>
                        <textarea
                          value={entry.remarks}
                          onChange={(e) => handleEntryChange(index, 'remarks', e.target.value)}
                          placeholder="Notes for this task..."
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="btn-primary" onClick={handleAddEntry} style={{marginTop: '16px'}}>
                + Add Task
              </button>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Record'}
            </button>
          </form>
        </div>
      )}

      {/* Work Records List */}
      <div className="worksheets-list">
        {workRecords.length === 0 ? (
          <p className="no-worksheets">No work records for {selectedDate}</p>
        ) : (
          workRecords.map((record) => (
            <div key={record.id} className="worksheet-card">
              <div className="worksheet-header-info">
                <h4>{getStaffName(record.staffId)} - {record.category}</h4>
              </div>
              <div className="worksheet-details">
                  <div className="summary-table-wrapper">
                    <table className="summary-table">
                      <thead>
                        <tr>
                          <th>Task Description</th>
                          <th>Morning Hours</th>
                          <th>Afternoon/Evening Hours</th>
                          <th>Total Hours</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.entries.map((entry, idx) => (
                          <tr key={idx}>
                            <td>{entry.taskDescription}</td>
                            <td>{entry.amHours}</td>
                            <td>{entry.pmHours}</td>
                            <td className="total">{entry.wholeDayHours}</td>
                            <td>{entry.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkRecordPage;
