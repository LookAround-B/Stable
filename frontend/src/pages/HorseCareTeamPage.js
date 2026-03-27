import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Users, Star, AlertTriangle, Shield, CheckCircle, Plus, X } from 'lucide-react';

const HorseCareTeamPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [careTeams, setCareTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedHorse, setSelectedHorse] = useState(null);

  const [formData, setFormData] = useState({
    horseId: '',
    role: 'Primary Groom', 
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

  const showMsg = (msg, type = "success") => {
    setMessage(msg); setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

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

  const getFilteredEmployeeList = (allEmployees) => {
    if (!user) return [];
    const visibleRoles = getVisibleRoles(user.designation);
    if (visibleRoles !== null) {
      allEmployees = allEmployees.filter(emp => visibleRoles.includes(emp.designation));
    }
    const userHierarchy = getHierarchyInfo(user.designation);
    return allEmployees.sort((a, b) => {
      if (a.isApproved !== b.isApproved) return a.isApproved ? 1 : -1; 
      const getPriority = (emp) => {
        if (userHierarchy.superiors.includes(emp.designation)) return 1; 
        if (emp.designation === user.designation) return 2; 
        if (userHierarchy.subordinates.includes(emp.designation)) return 3; 
        return 4; 
      };
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
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
      setHorses(Array.isArray(response.data) ? response.data : response.data.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      const allEmployees = Array.isArray(response.data) ? response.data : response.data.data || [];
      const stableStaff = allEmployees.filter((emp) =>
        ['Groom', 'Riding Boy', 'Rider', 'Jamedar', 'Instructor', 'Stable Manager'].includes(emp.designation)
      );
      setEmployees(getFilteredEmployeeList(stableStaff));
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.horseId || !formData.role || !formData.staffId) {
        throw new Error('Please fill in all required fields');
      }
      const response = await apiClient.post('/horse-care-team', {
        horseId: formData.horseId,
        staffId: formData.staffId,
        role: formData.role,
      });
      showMsg('Care team member assigned successfully!');
      setCareTeams([response.data, ...careTeams]);
      setShowForm(false);
      setFormData({ horseId: '', role: 'Primary Groom', staffId: '' });
      setSelectedHorse(null);
    } catch (error) {
      showMsg(error.response?.data?.message || error.message, 'error');
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

  if (!p.isAdmin && user?.designation !== 'Stable Manager') return <Navigate to="/dashboard" replace />;

  const totalHorses = horses.length;
  const horsesWithTeams = horses.filter((h) => getHorseCareTeam(h.id).length > 0).length;
  const unassignedHorses = totalHorses - horsesWithTeams;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Horse <span className="text-primary">Care Team</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Assign care team members to horses for grooming, riding, and medical care')}</p>
        </div>
        <div className="flex shrink-0">
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
          >
            {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Assign Member</>}
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === "error" ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><Star className="w-3.5 h-3.5 text-primary" /> ALL HORSES</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{totalHorses}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-success" /> WITH TEAM</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{horsesWithTeams}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><Users className="w-3.5 h-3.5 text-primary" /> TEAM MEMBERS</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{careTeams.length}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-warning" /> UNASSIGNED</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{unassignedHorses}</p>
          {unassignedHorses > 0 && <p className="text-xs mt-1 text-warning">Requires team assignment</p>}
        </div>
      </div>

      {/* Assignment Form */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <h3 className="text-lg font-bold text-foreground mb-4">Assign Care Team Member</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Horse *</label>
                  <SearchableSelect
                    name="horseId"
                    value={formData.horseId}
                    onChange={(e) => {
                      handleInputChange(e);
                      setSelectedHorse(horses.find((h) => h.id === e.target.value));
                    }}
                    options={[{ value: '', label: '-- Select Horse --' }, ...horses.map(h => ({ value: h.id, label: `${h.name} (Reg: ${h.registrationNumber || h.stableNumber})` }))]}
                    required disabled={loading}
                  />
                </div>
                {selectedHorse && (
                  <div className="p-3 rounded-lg bg-surface-container-high border border-border space-y-1 text-sm">
                    <p><span className="text-muted-foreground w-24 inline-block">Age:</span> <strong className="text-foreground">{selectedHorse.age || 'N/A'} years</strong></p>
                    <p><span className="text-muted-foreground w-24 inline-block">Breed:</span> <strong className="text-foreground">{t(selectedHorse.breed) || 'N/A'}</strong></p>
                    <p><span className="text-muted-foreground w-24 inline-block">Current Team:</span> <strong className="text-foreground">{getHorseCareTeam(selectedHorse.id).length} members</strong></p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Team Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required disabled={loading}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <p className="text-[10px] text-muted-foreground mt-2">Available staff types: {STAFF_ROLES[formData.role]?.join(', ')}</p>
              </div>

              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Staff Member *</label>
                <SearchableSelect
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleInputChange}
                  options={[{ value: '', label: '-- Select Staff --' }, ...getAvailableStaff(formData.role).map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))]}
                  required disabled={loading || !formData.role}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all">{loading ? 'Assigning...' : 'Assign to Team'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="h-10 px-6 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Horses Grid */}
      <h2 className="text-xl font-bold text-foreground pt-2">Horse Care Teams</h2>
      {horses.length === 0 ? (
        <p className="text-muted-foreground py-8">No horses available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {horses.map((horse) => {
            const team = getHorseCareTeam(horse.id);
            return (
              <div key={horse.id} className="bg-surface-container-highest rounded-xl p-5 edge-glow flex flex-col hover:border-border/50 transition-colors border border-transparent">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{horse.name}</h3>
                    <p className="text-xs text-muted-foreground">{horse.registrationNumber || horse.stableNumber || 'No ID'}</p>
                  </div>
                  {team.length === 0 && <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-warning/15 text-warning border border-warning/30">Needs Team</span>}
                  {team.length > 0 && <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-success/15 text-success border border-success/30"><CheckCircle className="w-3 h-3 inline mr-1 -mt-0.5"/>Ready</span>}
                </div>

                <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs mb-4 pb-4 border-b border-border/50 flex-1">
                  <p><span className="text-muted-foreground mr-1">Breed:</span> <strong className="text-foreground">{t(horse.breed) || '-'}</strong></p>
                  <p><span className="text-muted-foreground mr-1">Age:</span> <strong className="text-foreground">{horse.age || '-'}</strong></p>
                  <p><span className="text-muted-foreground mr-1">Gender:</span> <strong className="text-foreground">{horse.gender || '-'}</strong></p>
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">Care Team Members ({team.length})</h4>
                  {team.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No team assigned yet</p>
                  ) : (
                    <div className="space-y-2">
                      {team.map((member) => (
                        <div key={member.id} className="flex flex-col text-sm bg-surface-container-high rounded p-2 border border-border/30">
                          <span className="text-[10px] uppercase font-bold text-primary mb-0.5 tracking-wider">{member.role}</span>
                          <span className="text-foreground font-medium">{member.staff.fullName} <span className="text-muted-foreground text-xs ml-1">({t(member.staff.designation)})</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HorseCareTeamPage;
