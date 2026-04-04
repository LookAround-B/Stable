import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Users, Star, AlertTriangle, Shield, CheckCircle, Plus, X } from 'lucide-react';

const HORSE_TEAM_FILTER_OPTIONS = [
  { value: 'all', label: 'All Horses' },
  { value: 'with-team', label: 'With Team' },
  { value: 'needs-team', label: 'Needs Team' },
];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');

  const [formData, setFormData] = useState({
    horseId: '',
    role: 'Groom', 
    staffId: '',
  });

  const ROLES = ['Groom', 'Rider', 'Jamedar', 'Instructor', 'Farrier'];
  const STAFF_ROLES = {
    'Groom': ['Groom', 'Stable Manager'],
    'Rider': ['Riding Boy', 'Rider'],
    'Jamedar': ['Jamedar'],
    'Instructor': ['Instructor'],
    'Farrier': ['Farrier'],
  };
  const canManageCareTeams = p.manageHorseTeams;

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
        ['Groom', 'Riding Boy', 'Rider', 'Jamedar', 'Instructor', 'Stable Manager', 'Farrier'].includes(emp.designation)
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
      setFormData({ horseId: '', role: 'Groom', staffId: '' });
      setSelectedHorse(null);
    } catch (error) {
      showMsg(error.response?.data?.error || error.response?.data?.message || error.message, 'error');
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

  const getHorseAgeLabel = (horse) => {
    if (!horse) return 'N/A';
    if (horse.age !== null && horse.age !== undefined && horse.age !== '') {
      return `${horse.age} years`;
    }
    if (horse.dateOfBirth) {
      const dob = new Date(horse.dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        let years = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          years -= 1;
        }
        if (years >= 0) {
          return `${years} years`;
        }
      }
    }
    return 'N/A';
  };

  if (!canManageCareTeams && !p.viewHorses) return <Navigate to="/dashboard" replace />;

  const totalHorses = horses.length;
  const horsesWithTeams = horses.filter((h) => getHorseCareTeam(h.id).length > 0).length;
  const unassignedHorses = totalHorses - horsesWithTeams;
  const filteredHorses = horses.filter((horse) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || [
      horse.name,
      horse.registrationNumber,
      horse.stableNumber,
      horse.breed,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));

    if (!matchesSearch) {
      return false;
    }

    const hasTeam = getHorseCareTeam(horse.id).length > 0;
    if (teamFilter === 'with-team') {
      return hasTeam;
    }
    if (teamFilter === 'needs-team') {
      return !hasTeam;
    }
    return true;
  });

  return (
    <div className="horse-care-team-page space-y-6">
      {/* Header */}
      <div className="horse-care-team-header-row flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Horse <span className="text-primary">{t("Care Team")}</span></h1>
        </div>
        {canManageCareTeams && (
          <div className="flex shrink-0">
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="horse-care-team-header-btn h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
            >
              {showForm ? (
                <><X className="w-4 h-4" /> {t("Cancel")}</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="sm:hidden">{t("Member")}</span>
                  <span className="hidden sm:inline">{t("Assign Member")}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === "error" ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <OperationalMetricCard label={t("ALL HORSES")} value={String(totalHorses).padStart(2, '0')} icon={Star} colorClass="text-primary" bgClass="bg-primary/10" sub={t("Tracked care roster")} hideSub />
        <OperationalMetricCard label={t("WITH TEAM")} value={String(horsesWithTeams).padStart(2, '0')} icon={Shield} colorClass="text-success" bgClass="bg-success/10" sub={t("Assigned care teams")} subColor="text-success" hideSub />
        <OperationalMetricCard label={t("TEAM MEMBERS")} value={String(careTeams.length).padStart(2, '0')} icon={Users} colorClass="text-primary" bgClass="bg-primary/10" sub={t("Total linked staff")} hideSub />
        <OperationalMetricCard label={t("UNASSIGNED")} value={String(unassignedHorses).padStart(2, '0')} icon={AlertTriangle} colorClass="text-warning" bgClass="bg-warning/10" sub={unassignedHorses > 0 ? 'Requires team assignment' : 'All horses covered'} subColor={unassignedHorses > 0 ? 'text-warning' : 'text-success'} hideSub />
      </div>

      {/* Assignment Form */}
      {showForm && (
        <div className="efm-page-modal-overlay fixed inset-0 z-[60] flex items-start justify-center overflow-hidden bg-background/80 backdrop-blur-sm px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={() => setShowForm(false)}>
          <div className="my-auto flex w-full max-w-4xl flex-col overflow-visible rounded-2xl border border-border bg-surface-container-highest edge-glow xl:max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
              <h3 className="text-xl font-bold text-foreground">{t("Assign Care Team Member")}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:px-5 sm:py-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Horse *")}</label>
                      <SearchableSelect
                        name="horseId"
                        value={formData.horseId}
                        onChange={(e) => {
                          handleInputChange(e);
                          setSelectedHorse(horses.find((h) => h.id === e.target.value));
                        }}
                        options={[{ value: '', label: '-- Select Horse --' }, ...horses.map(h => ({ value: h.id, label: `${h.name} (Reg: ${h.registrationNumber || h.stableNumber})` }))]}
                        required
                        disabled={loading}
                      />
                    </div>
                    {selectedHorse && (
                      <div className="p-3 rounded-lg bg-surface-container-high border border-border space-y-1 text-sm">
                        <p><span className="text-muted-foreground w-24 inline-block">Age:</span> <strong className="text-foreground">{getHorseAgeLabel(selectedHorse)}</strong></p>
                        <p><span className="text-muted-foreground w-24 inline-block">Breed:</span> <strong className="text-foreground">{t(selectedHorse.breed) || 'N/A'}</strong></p>
                        <p><span className="text-muted-foreground w-24 inline-block">Current Team:</span> <strong className="text-foreground">{getHorseCareTeam(selectedHorse.id).length} members</strong></p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Team Role *")}</label>
                    <SearchableSelect
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      options={ROLES.map((role) => ({ value: role, label: role }))}
                      required
                      disabled={loading}
                    />
                    <p className="text-[10px] text-muted-foreground mt-2">Available staff types: {STAFF_ROLES[formData.role]?.join(', ')}</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Staff Member *")}</label>
                    <SearchableSelect
                      name="staffId"
                      value={formData.staffId}
                      onChange={handleInputChange}
                      options={[{ value: '', label: '-- Select Staff --' }, ...getAvailableStaff(formData.role).map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))]}
                      required
                      disabled={loading || !formData.role}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className="btn-save-primary">{loading ? 'Assigning...' : 'Assign to Team'}</button>
                  <button type="button" onClick={() => setShowForm(false)} className="h-10 px-6 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Horses Grid */}
      <div className="horse-care-team-toolbar flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <div className="horse-care-team-search relative w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("Search horse care teams...")}
            className="h-10 w-full rounded-lg border border-border bg-surface-container-high pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              type="button"
              aria-label={t("Clear search")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <SearchableSelect
          name="teamFilter"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          options={HORSE_TEAM_FILTER_OPTIONS}
          className="horse-care-team-filter shrink-0"
          searchable={false}
        />
      </div>
      {filteredHorses.length === 0 ? (
        <p className="text-muted-foreground py-8">{t(t("No horses available"))}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredHorses.map((horse) => {
            const team = getHorseCareTeam(horse.id);
            return (
              <div key={horse.id} className="bg-surface-container-highest rounded-xl p-5 edge-glow flex flex-col hover:border-border/50 transition-colors border border-transparent">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{horse.name}</h3>
                    <p className="text-xs text-muted-foreground">{horse.registrationNumber || horse.stableNumber || 'No ID'}</p>
                  </div>
                  {team.length === 0 && <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-warning/15 text-warning border border-warning/30">{t("Needs Team")}</span>}
                  {team.length > 0 && <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase bg-success/15 text-success border border-success/30"><CheckCircle className="w-3 h-3 inline mr-1 -mt-0.5"/>{t("Ready")}</span>}
                </div>

                <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs mb-4 pb-4 border-b border-border/50 flex-1">
                  <p><span className="text-muted-foreground mr-1">Breed:</span> <strong className="text-foreground">{t(horse.breed) || '-'}</strong></p>
                  <p><span className="text-muted-foreground mr-1">Age:</span> <strong className="text-foreground">{horse.age || '-'}</strong></p>
                  <p><span className="text-muted-foreground mr-1">Gender:</span> <strong className="text-foreground">{horse.gender || '-'}</strong></p>
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-3">Care Team Members ({team.length})</h4>
                  {team.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">{t("No team assigned yet")}</p>
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
