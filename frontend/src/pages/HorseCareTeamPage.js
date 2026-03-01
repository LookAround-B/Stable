import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import '../styles/HorseCareTeamPage.css';

const HorseCareTeamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Define hierarchy relationships for sorting
  const getHierarchyInfo = (designation) => {
    const hierarchy = {
      'Super Admin': { superiors: [], subordinates: ['Director', 'School Administrator', 'Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'Director': { superiors: ['Super Admin'], subordinates: ['School Administrator', 'Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'School Administrator': { superiors: ['Director', 'Super Admin'], subordinates: ['Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'Ground Supervisor': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Guard', 'Gardener', 'Housekeeping', 'Electrician'] },
      'Stable Manager': { superiors: ['Director', 'School Administrator', 'Super Admin', 'Ground Supervisor'], subordinates: ['Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar'] },
      'Senior Executive Admin': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Executive Admin'] },
      'Senior Executive Accounts': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Executive Accounts'] },
      'Guard': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Gardener': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Housekeeping': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Electrician': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Groom': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Riding Boy': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Rider': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Instructor': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Farrier': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Jamedar': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Executive Admin': { superiors: ['Senior Executive Admin', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Executive Accounts': { superiors: ['Senior Executive Accounts', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
    };
    return hierarchy[designation] || { superiors: [], subordinates: [] };
  };

  // Define which roles each designation can see
  const getVisibleRoles = (userDesignation) => {
    const roleVisibility = {
      'Super Admin': null,
      'Director': null,
      'School Administrator': null,
      'Ground Supervisor': ['Ground Supervisor', 'Director', 'School Administrator', 'Super Admin', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician'],
      'Stable Manager': ['Stable Manager', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Senior Executive Admin', 'Senior Executive Accounts', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar'],
      'Senior Executive Admin': ['Senior Executive Admin', 'Senior Executive Accounts', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Stable Manager', 'Executive Admin'],
      'Senior Executive Accounts': ['Senior Executive Accounts', 'Senior Executive Admin', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Stable Manager', 'Executive Accounts'],
      'Jamedar': ['Jamedar', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Guard': ['Guard', 'Ground Supervisor', 'Gardener', 'Housekeeping', 'Electrician'],
      'Groom': ['Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Riding Boy': ['Riding Boy', 'Groom', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Rider': ['Rider', 'Groom', 'Riding Boy', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Instructor': ['Instructor', 'Groom', 'Riding Boy', 'Rider', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Farrier': ['Farrier', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Electrician': ['Electrician', 'Ground Supervisor', 'Guard', 'Gardener', 'Housekeeping'],
      'Gardener': ['Gardener', 'Ground Supervisor', 'Guard', 'Housekeeping', 'Electrician'],
      'Housekeeping': ['Housekeeping', 'Ground Supervisor', 'Guard', 'Gardener', 'Electrician'],
      'Executive Admin': ['Executive Admin', 'Senior Executive Admin', 'Director', 'School Administrator', 'Super Admin'],
      'Executive Accounts': ['Executive Accounts', 'Senior Executive Accounts', 'Director', 'School Administrator', 'Super Admin'],
    };
    return roleVisibility[userDesignation];
  };

  // Filter and sort employees based on user's role
  const getFilteredEmployeeList = (allEmployees) => {
    if (!user) return [];
    
    const visibleRoles = getVisibleRoles(user.designation);
    
    // Super Admin, Director, School Administrator see all
    if (visibleRoles !== null) {
      // Filter by visible roles
      allEmployees = allEmployees.filter(emp => visibleRoles.includes(emp.designation));
    }

    // Sort: pending first, then superiors, then self/peers, then subordinates
    const userHierarchy = getHierarchyInfo(user.designation);
    return allEmployees.sort((a, b) => {
      // 1. Pending employees first
      if (a.isApproved !== b.isApproved) {
        return a.isApproved ? 1 : -1; // Not approved comes first
      }

      // 2. Get sort priority for each employee
      const getPriority = (emp) => {
        if (userHierarchy.superiors.includes(emp.designation)) return 1; // Superiors
        if (emp.designation === user.designation) return 2; // Self/peers
        if (userHierarchy.subordinates.includes(emp.designation)) return 3; // Subordinates
        return 4; // Others
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Within same priority, sort by name
      return a.fullName.localeCompare(b.fullName);
    });
  };

  useEffect(() => {
    loadCareTeams();
    loadHorses();
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Apply role-based filtering
      const filteredEmployees = getFilteredEmployeeList(stableStaff);
      setEmployees(filteredEmployees);
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

  return user?.designation === 'Guard' ? (
    <div className="care-team-page">
      <div className="access-denied">
        <h2>❌ Access Denied</h2>
        <p>You do not have permission to access horse care team data.</p>
        <button onClick={() => navigate('/')} className="btn-back">
          Go to Dashboard
        </button>
      </div>
    </div>
  ) : (
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
              <SearchableSelect
                id="horseId"
                name="horseId"
                value={formData.horseId}
                onChange={(e) => {
                  handleInputChange(e);
                  const horse = horses.find((h) => h.id === e.target.value);
                  setSelectedHorse(horse);
                }}
                placeholder="-- Select Horse --"
                required
                disabled={loading}
                options={[
                  { value: '', label: '-- Select Horse --' },
                  ...horses.map(h => ({ value: h.id, label: `${h.name} (Reg: ${h.registrationNumber})` }))
                ]}
              />
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
              <SearchableSelect
                id="staffId"
                name="staffId"
                value={formData.staffId}
                onChange={handleInputChange}
                placeholder="-- Select Staff --"
                required
                disabled={loading || !formData.role}
                options={[
                  { value: '', label: '-- Select Staff --' },
                  ...getAvailableStaff(formData.role).map(s => ({ value: s.id, label: `${s.fullName} (${s.designation})` }))
                ]}
              />
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
