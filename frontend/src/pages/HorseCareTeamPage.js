import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/HorseCareTeamPage.css';

const HorseCareTeamPage = () => {
  const { user } = useAuth();
  const [careTeams, setCareTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedHorse, setSelectedHorse] = useState(null);

  const [formData, setFormData] = useState({
    horseId: '',
    role: 'Primary Groom', // Primary Groom, Rider, Jamedar, Instructor, Alternative Groom
    staffId: '',
  });

  const ROLES = ['Primary Groom', 'Alternative Groom', 'Rider', 'Jamedar', 'Instructor'];
  const STAFF_ROLES = {
    'Primary Groom': ['Groom', 'Stable Manager'],
    'Alternative Groom': ['Groom'],
    'Rider': ['Riding Boy', 'Rider'],
    'Jamedar': ['Jamedar'],
    'Instructor': ['Instructor'],
  };

  useEffect(() => {
    loadCareTeams();
    loadHorses();
    loadEmployees();
  }, []);

  const loadCareTeams = async () => {
    try {
      const response = await apiClient.get('/horse-care-team');
      setCareTeams(response.data);
    } catch (error) {
      console.error('Error loading care teams:', error);
    }
  };

  const loadHorses = async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      // Filter for stable operations staff only
      const stableStaff = response.data.filter((emp) =>
        ['Groom', 'Riding Boy', 'Rider', 'Jamedar', 'Instructor', 'Stable Manager'].includes(
          emp.designation
        )
      );
      setEmployees(stableStaff);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!formData.horseId || !formData.role || !formData.staffId) {
        throw new Error('Please fill in all required fields');
      }

      const payload = {
        horseId: formData.horseId,
        staffId: formData.staffId,
        role: formData.role,
      };

      const response = await apiClient.post('/horse-care-team', payload);
      
      setMessage('✓ Care team member assigned successfully!');
      setCareTeams([response.data, ...careTeams]);
      setShowForm(false);

      setFormData({
        horseId: '',
        role: 'Primary Groom',
        staffId: '',
      });
      setSelectedHorse(null);

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage(`✗ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStaff = (roleType) => {
    const allowedRoles = STAFF_ROLES[roleType] || [];
    return employees.filter((emp) => allowedRoles.includes(emp.designation));
  };

  const getHorseCareTeam = (horseId) => {
    return careTeams.filter((team) => team.horseId === horseId);
  };

  // Only Stable Manager can access this page
  if (user?.designation !== 'Stable Manager') {
    return (
      <div className="care-team-page">
        <h1>🚫 Access Denied</h1>
        <p>Only Stable Manager can access the Horse Care Team page.</p>
      </div>
    );
  }

  return (
    <div className="care-team-page">
      <h1>👥 Horse Care Team Management</h1>
      <p className="subtitle">
        Assign care team members to horses for grooming, riding, and medical care
      </p>

      <button
        className="btn-add"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? '✕ Cancel' : '+ Assign Care Team Member'}
      </button>

      {/* Assignment Form */}
      {showForm && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="care-form">
            <div className="form-group">
              <label htmlFor="horseId">Horse *</label>
              <select
                id="horseId"
                name="horseId"
                value={formData.horseId}
                onChange={(e) => {
                  handleInputChange(e);
                  const horse = horses.find((h) => h.id === e.target.value);
                  setSelectedHorse(horse);
                }}
                required
                disabled={loading}
              >
                <option value="">-- Select Horse --</option>
                {horses.map((horse) => (
                  <option key={horse.id} value={horse.id}>
                    {horse.name} (Reg: {horse.registrationNumber})
                  </option>
                ))}
              </select>
            </div>

            {selectedHorse && (
              <div className="horse-info">
                <p>
                  <strong>Age:</strong> {selectedHorse.age || 'N/A'} years
                </p>
                <p>
                  <strong>Breed:</strong> {selectedHorse.breed || 'N/A'}
                </p>
                <p>
                  <strong>Current Team:</strong>{' '}
                  {getHorseCareTeam(selectedHorse.id).length > 0
                    ? `${getHorseCareTeam(selectedHorse.id).length} members`
                    : 'No team assigned yet'}
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="role">Team Role *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                disabled={loading}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <small>
                {formData.role &&
                  `Available staff: ${STAFF_ROLES[formData.role]?.join(', ')}`}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="staffId">Staff Member *</label>
              <select
                id="staffId"
                name="staffId"
                value={formData.staffId}
                onChange={handleInputChange}
                required
                disabled={loading || !formData.role}
              >
                <option value="">-- Select Staff --</option>
                {getAvailableStaff(formData.role).map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.designation})
                  </option>
                ))}
              </select>
            </div>

            {message && (
              <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Assigning...' : 'Assign to Team'}
            </button>
          </form>
        </div>
      )}

      {/* Care Teams by Horse */}
      <div className="teams-container">
        <h2>🏇 Horse Care Teams</h2>
        {horses.length === 0 ? (
          <p className="no-data">No horses available</p>
        ) : (
          <div className="horses-grid">
            {horses.map((horse) => {
              const team = getHorseCareTeam(horse.id);
              return (
                <div key={horse.id} className="horse-card">
                  <div className="horse-header">
                    <h3>{horse.name}</h3>
                    <span className="reg-number">{horse.registrationNumber}</span>
                  </div>

                  <div className="horse-details">
                    <p>
                      <strong>Breed:</strong> {horse.breed || 'N/A'}
                    </p>
                    <p>
                      <strong>Age:</strong> {horse.age || 'N/A'} years
                    </p>
                    <p>
                      <strong>Height:</strong> {horse.height || 'N/A'} hh
                    </p>
                  </div>

                  <div className="team-section">
                    <h4>Care Team ({team.length})</h4>
                    {team.length === 0 ? (
                      <p className="no-team">No care team assigned yet</p>
                    ) : (
                      <ul className="team-list">
                        {team.map((member) => (
                          <li key={member.id} className="team-member">
                            <span className="role-badge">{member.role}</span>
                            <span className="staff-name">
                              {member.staff.fullName}
                            </span>
                            <span className="staff-designation">
                              {member.staff.designation}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="stats-container">
        <h2>📊 Team Assignment Summary</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Total Horses</h4>
            <p className="stat-value">{horses.length}</p>
          </div>
          <div className="stat-card">
            <h4>Horses with Teams</h4>
            <p className="stat-value">
              {horses.filter((h) => getHorseCareTeam(h.id).length > 0).length}
            </p>
          </div>
          <div className="stat-card">
            <h4>Total Team Members</h4>
            <p className="stat-value">{careTeams.length}</p>
          </div>
          <div className="stat-card">
            <h4>Unassigned Horses</h4>
            <p className="stat-value">
              {horses.filter((h) => getHorseCareTeam(h.id).length === 0).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorseCareTeamPage;
