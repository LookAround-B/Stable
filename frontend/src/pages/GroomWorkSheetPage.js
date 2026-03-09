import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';

const GroomWorkSheetPage = () => {
  const { user } = useAuth();
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
    entries: [
      {
        horseId: '',
        amHours: 0,
        pmHours: 0,
        wholeDayHours: 0,
        woodchipsUsed: 0,
        bichaliUsed: 0,
        booSaUsed: 0,
        remarks: '',
      },
    ],
    remarks: '',
  });

  const loadWorksheets = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date: selectedDate };
      if (filterGroomId !== 'all') {
        params.groomId = filterGroomId;
      }

      const response = await apiClient.get('/grooming/worksheet', { params });
      setWorksheets(response.data.data || []);
      setMessage('');
    } catch (error) {
      console.error('Error loading worksheets:', error);
      setMessage('Failed to load worksheets');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterGroomId]);

  const loadHorses = useCallback(async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  useEffect(() => {
    loadWorksheets();
    loadHorses();
    loadEmployees();
  }, [selectedDate, filterGroomId, loadWorksheets, loadHorses, loadEmployees]);

  const handleAddEntry = () => {
    setNewWorksheet({
      ...newWorksheet,
      entries: [
        ...newWorksheet.entries,
        {
          horseId: '',
          amHours: 0,
          pmHours: 0,
          wholeDayHours: 0,
          woodchipsUsed: 0,
          bichaliUsed: 0,
          booSaUsed: 0,
          remarks: '',
        },
      ],
    });
  };

  const handleRemoveEntry = (index) => {
    setNewWorksheet({
      ...newWorksheet,
      entries: newWorksheet.entries.filter((_, i) => i !== index),
    });
  };

  const handleEntryChange = (index, field, value) => {
    const updatedEntries = [...newWorksheet.entries];
    updatedEntries[index][field] = value;

    // Calculate whole day hours
    if (field === 'amHours' || field === 'pmHours') {
      updatedEntries[index].wholeDayHours = Number(updatedEntries[index].amHours) + Number(updatedEntries[index].pmHours);
    }

    setNewWorksheet({
      ...newWorksheet,
      entries: updatedEntries,
    });
  };

  const handleSubmitWorksheet = async (e) => {
    e.preventDefault();

    if (!newWorksheet.groomId || newWorksheet.entries.length === 0) {
      setMessage('Please select a groom and add at least one horse entry');
      return;
    }

    const hasEmptyHorse = newWorksheet.entries.some((e) => !e.horseId);
    if (hasEmptyHorse) {
      setMessage('Please select a horse for all entries');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        groomId: newWorksheet.groomId,
        date: selectedDate,
        entries: newWorksheet.entries.map((e) => ({
          horseId: e.horseId,
          amHours: Number(e.amHours),
          pmHours: Number(e.pmHours),
          wholeDayHours: Number(e.wholeDayHours),
          woodchipsUsed: Number(e.woodchipsUsed),
          bichaliUsed: Number(e.bichaliUsed),
          booSaUsed: Number(e.booSaUsed),
          remarks: e.remarks,
        })),
        remarks: newWorksheet.remarks,
      };

      const response = await apiClient.post('/grooming/worksheet', payload);
      setWorksheets([...worksheets, response.data.data]);
      setNewWorksheet({
        groomId: user?.designation === 'Groom' ? user?.id : '',
        entries: [
          {
            horseId: '',
            amHours: 0,
            pmHours: 0,
            wholeDayHours: 0,
            woodchipsUsed: 0,
            bichaliUsed: 0,
            booSaUsed: 0,
            remarks: '',
          },
        ],
        remarks: '',
      });
      setShowAddForm(false);
      setMessage('Worksheet created successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating worksheet:', error);
      setMessage('Failed to create worksheet');
    } finally {
      setLoading(false);
    }
  };

  const getHorseName = (id) => {
    const horse = horses.find((h) => h.id === id);
    return horse ? horse.name : 'Unknown';
  };

  const getGroomers = () => {
    return employees.filter((e) => e.designation === 'Groom');
  };

  const canCreateWorksheet = [
    'Super Admin',
    'Director',
    'School Administrator',
    'Stable Manager',
    'Groom',
  ].includes(user?.designation);

  return (
    <div className="groom-worksheet-page">
      <div className="page-header">
        <div>
          <h1>Groom Work Sheet</h1>
          <p className="info-text">Track groom activities, horse care hours, and supplies used daily.</p>
        </div>
      </div>

      {message && <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

      <div className="worksheet-header">
        <div className="header-left">
          <label style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            Select Date:
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>

          <div style={{ minWidth: '300px' }}>
            <SearchableSelect
              value={filterGroomId}
              onChange={(e) => setFilterGroomId(e.target.value)}
              placeholder="All Grooms"
              options={[
                { value: 'all', label: 'All Grooms' },
                ...getGroomers().map(g => ({ value: g.id, label: g.fullName }))
              ]}
            />
          </div>
        </div>

        {canCreateWorksheet && (
          <button className="btn-add-worksheet" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ Cancel' : '+ New Worksheet'}
          </button>
        )}
      </div>

      {/* Add Worksheet Form */}
      {showAddForm && canCreateWorksheet && (
        <div className="add-worksheet-form">
          <h3>Create New Work Sheet</h3>
          <form onSubmit={handleSubmitWorksheet}>
            <div className="form-row">
              <div className="form-group">
                <label>Groom *</label>
                <SearchableSelect
                  value={newWorksheet.groomId}
                  onChange={(e) => setNewWorksheet({ ...newWorksheet, groomId: e.target.value })}
                  placeholder="Select Groom"
                  required
                  disabled={user?.designation === 'Groom'}
                  options={[
                    { value: '', label: 'Select Groom' },
                    ...getGroomers().map(g => ({ value: g.id, label: g.fullName }))
                  ]}
                />
              </div>

              <div className="form-group">
                <label>Overall Remarks</label>
                <textarea
                  value={newWorksheet.remarks}
                  onChange={(e) => setNewWorksheet({ ...newWorksheet, remarks: e.target.value })}
                  placeholder="General notes for the day..."
                  rows="2"
                />
              </div>
            </div>

            <div className="entries-section">
              <div className="entries-header">
                <h4>Horse Entries</h4>
              </div>

              {newWorksheet.entries.map((entry, index) => (
                <div key={index} className="entry-card">
                  <div className="entry-header">
                    <h5>Horse {index + 1}</h5>
                    {newWorksheet.entries.length > 1 && (
                      <button type="button" className="btn-remove" onClick={() => handleRemoveEntry(index)}>
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="entry-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Horse *</label>
                        <SearchableSelect
                          value={entry.horseId}
                          onChange={(e) => handleEntryChange(index, 'horseId', e.target.value)}
                          placeholder="Select Horse"
                          required
                          options={[
                            { value: '', label: 'Select Horse' },
                            ...horses.map(h => ({ value: h.id, label: h.name }))
                          ]}
                        />
                      </div>

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
                      <div className="form-group">
                        <label>Woodchips (B) Units</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={entry.woodchipsUsed}
                          onChange={(e) => handleEntryChange(index, 'woodchipsUsed', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Bichali (kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={entry.bichaliUsed}
                          onChange={(e) => handleEntryChange(index, 'bichaliUsed', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Boo Sa (bags)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={entry.booSaUsed}
                          onChange={(e) => handleEntryChange(index, 'booSaUsed', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>Remarks</label>
                        <textarea
                          value={entry.remarks}
                          onChange={(e) => handleEntryChange(index, 'remarks', e.target.value)}
                          placeholder="Notes for this horse..."
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="btn-primary" onClick={handleAddEntry} style={{marginTop: '16px'}}>
                + Add Horse
              </button>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Worksheet'}
            </button>
          </form>
        </div>
      )}

      {/* Worksheets List */}
      <div className="worksheets-list">
        {worksheets.length === 0 ? (
          <p className="no-worksheets">No worksheets for {selectedDate}</p>
        ) : (
          worksheets.map((worksheet) => (
            <div key={worksheet.id} className="worksheet-card">
              <div className="worksheet-details">
                  <div className="summary-table-wrapper">
                    <table className="summary-table">
                      <thead>
                        <tr>
                          <th>Horse</th>
                          <th>Morning Hours</th>
                          <th>Afternoon/Evening Hours</th>
                          <th>Total Hours</th>
                          <th>Woodchips</th>
                          <th>Bichali (kg)</th>
                          <th>Boo Sa (bags)</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {worksheet.entries.map((entry, idx) => (
                          <tr key={idx}>
                            <td>{getHorseName(entry.horseId)}</td>
                            <td>{entry.amHours}</td>
                            <td>{entry.pmHours}</td>
                            <td className="total">{entry.wholeDayHours}</td>
                            <td>{entry.woodchipsUsed || '-'}</td>
                            <td>{entry.bichaliUsed || '-'}</td>
                            <td>{entry.booSaUsed || '-'}</td>
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

export default GroomWorkSheetPage;
