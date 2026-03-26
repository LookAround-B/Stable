import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import DirectoryMetricCard from '../components/DirectoryMetricCard';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Camera, Download, FileText, Link2, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const SUPERVISORY_ROLES = [
  'Super Admin',
  'Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Ground Supervisor',
  'Senior Executive Accounts',
];

const STATUS_STYLES = {
  Active: { dot: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  Resting: { dot: 'var(--lovable-primary)', bg: 'rgba(209, 153, 255, 0.1)', text: 'var(--lovable-primary)' },
  Medical: { dot: '#fb7185', bg: 'rgba(251, 113, 133, 0.1)', text: '#fb7185' },
  Retired: { dot: 'rgba(161, 161, 170, 0.9)', bg: 'rgba(113, 113, 122, 0.16)', text: 'rgba(212, 212, 216, 0.9)' },
};

const PerformanceBar = ({ value }) => {
  const bars = 5;
  const filled = Math.max(1, Math.min(bars, Math.round((value / 100) * bars)));

  return (
    <div className="horse-performance">
      <span className="horse-performance-value">{value}%</span>
      <div className="horse-performance-bars">
        {Array.from({ length: bars }, (_, index) => (
          <div
            key={index}
            className={`horse-performance-bar ${index < filled ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

const getDateValue = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};

const createMonthBuckets = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      value: 0,
    };
  });
};

const buildMetricSpark = (items, getItemDate, getItemValue = () => 1, { cumulative = false, fallbackTotal = 0 } = {}) => {
  const buckets = createMonthBuckets();
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  items.forEach((item) => {
    const date = getItemDate(item);
    if (!date) return;
    const bucket = bucketMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (!bucket) return;
    bucket.value += getItemValue(item);
  });

  const values = buckets.map((bucket) => bucket.value);

  if (cumulative) {
    let running = 0;
    return values.map((value) => {
      running += value;
      return running;
    });
  }

  if (values.every((value) => value === 0) && fallbackTotal) {
    return buckets.map((_, index) => Math.max(1, Math.round((fallbackTotal * (index + 1)) / buckets.length)));
  }

  return values;
};

const HorsesPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const p = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [horses, setHorses] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightId, setHighlightId] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [newHorseImage, setNewHorseImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const horseImgRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Stallion',
    breed: '',
    color: '',
    dateOfBirth: '',
    height: '',
    stableNumber: '',
    supervisorId: '',
    passportNumber: '',
  });
  const [message, setMessage] = useState('');

  // Leadership and Stable Operations management can add horses
  const canAddHorse = [
    'Super Admin',
    'Director',
    'School Administrator',
    'Stable Manager',
    'Instructor'
  ].includes(user?.designation);

  useEffect(() => {
    loadHorsesAndSupervisors();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('highlight');
    if (id) {
      setHighlightId(id);
      setTimeout(() => {
        const el = document.getElementById('horse-row-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      setTimeout(() => setHighlightId(null), 2200);
    }
  }, [location.search]);

  const loadHorsesAndSupervisors = async () => {
    try {
      const [horsesRes, employeesRes] = await Promise.all([
        apiClient.get('/horses'),
        apiClient.get('/employees'),
      ]);
      
      const horsesList = horsesRes.data.data || [];
      const employeesList = employeesRes.data.data || [];
      
      setHorses(horsesList);
      
      // Filter supervisory roles for supervisor dropdown
      const supervisorList = employeesList.filter((emp) =>
        SUPERVISORY_ROLES.includes(emp.designation) && emp.isApproved
      );
      setSupervisors(supervisorList);
    } catch (error) {
      console.error('Error loading data:', error);
      setHorses([]); // Set empty array on error
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Generate random alphanumeric stable number (e.g., A12, B7, ST-09)
  const generateStableNumber = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const formats = [
      () => letters.charAt(Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 100), // A12
      () => letters.substring(0, 2).split('').map(() => letters.charAt(Math.floor(Math.random() * 26))).join('') + '-' + Math.floor(Math.random() * 100).toString().padStart(2, '0'), // ST-09
      () => letters.charAt(Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 10), // B7
    ];
    const format = formats[Math.floor(Math.random() * formats.length)];
    return format();
  };

  const handleAddHorse = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      if (!formData.name || !formData.gender) {
        throw new Error('Name and Gender are required');
      }

      // Generate stable number if not provided
      const stableNumber = formData.stableNumber || generateStableNumber();

      // Call API to create horse
      await apiClient.post('/horses', {
        name: formData.name,
        gender: formData.gender,
        breed: formData.breed,
        color: formData.color,
        dateOfBirth: formData.dateOfBirth || null,
        height: formData.height ? parseFloat(formData.height) : null,
        stableNumber: stableNumber,
        supervisorId: formData.supervisorId || null,
        status: 'Active',
        profileImage: newHorseImage || null,
        passportNumber: formData.passportNumber.trim() || null,
      });

      setMessage('Horse added successfully!');
      setNewHorseImage(null);
      
      // Reload horses
      loadHorsesAndSupervisors();
      
      // Reset form
      setFormData({
        name: '',
        gender: 'Stallion',
        breed: '',
        color: '',
        dateOfBirth: '',
        height: '',
        stableNumber: '',
        supervisorId: '',
      });
      setShowModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage('Error adding horse: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resizeImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 700;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handleHorseImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await resizeImage(file);
    setNewHorseImage(base64);
    e.target.value = '';
  };

  const closeModal = () => {
    setShowModal(false);
    setMessage('');
    setNewHorseImage(null);
    setFormData({
      name: '',
      gender: 'Stallion',
      breed: '',
      color: '',
      dateOfBirth: '',
      height: '',
      stableNumber: '',
      supervisorId: '',
      passportNumber: '',
    });
  };

  // Get horses assigned to current user (if supervisor)
  const myHorses = horses.filter((horse) => horse.supervisorId === user?.id);

  // Filter horses based on search term
  const filteredHorses = horses.filter((horse) =>
    horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (horse.breed && horse.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.color && horse.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.gender && horse.gender.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.stableNumber && horse.stableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMyHorses = myHorses.filter((horse) =>
    horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (horse.breed && horse.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.color && horse.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.gender && horse.gender.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.stableNumber && horse.stableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalHorses = horses.length;
  const activeHorses = horses.filter((horse) => (horse.status || '').toLowerCase() === 'active').length;
  const assignedHorses = horses.filter((horse) => horse.supervisorId || horse.supervisor).length;
  const passportedHorses = horses.filter((horse) => horse.passportNumber).length;
  const horseSpark = buildMetricSpark(
    horses,
    (horse) => getDateValue(horse.createdAt, horse.updatedAt),
    () => 1,
    { cumulative: true, fallbackTotal: totalHorses }
  );
  const activeSpark = buildMetricSpark(
    horses,
    (horse) => getDateValue(horse.createdAt, horse.updatedAt),
    (horse) => ((horse.status || '').toLowerCase() === 'active' ? 1 : 0),
    { fallbackTotal: activeHorses }
  );
  const assignedSpark = buildMetricSpark(
    horses,
    (horse) => getDateValue(horse.createdAt, horse.updatedAt),
    (horse) => (horse.supervisorId || horse.supervisor ? 1 : 0),
    { fallbackTotal: assignedHorses }
  );
  const passportSpark = buildMetricSpark(
    horses,
    (horse) => getDateValue(horse.createdAt, horse.updatedAt),
    (horse) => (horse.passportNumber ? 1 : 0),
    { fallbackTotal: passportedHorses }
  );

  const getHorsePerformance = (horse) => {
    const rawId = String(horse.id || '');
    const numeric = parseInt(rawId.replace(/\D/g, ''), 10);
    const seed = Number.isNaN(numeric)
      ? rawId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
      : numeric;
    return 40 + ((seed * 17 + 13) % 61);
  };

  const getHorseReferenceId = (horse) => {
    const source = horse.passportNumber || horse.stableNumber || horse.id || '';
    return String(source).split(/[-/]/).filter(Boolean).pop() || String(horse.id).slice(0, 6);
  };

  const getStatusStyle = (status) => STATUS_STYLES[status] || {
    dot: 'rgba(161, 161, 170, 0.9)',
    bg: 'rgba(113, 113, 122, 0.16)',
    text: 'rgba(212, 212, 216, 0.9)',
  };

  // Pagination
  const totalPages = Math.ceil(filteredHorses.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedHorses = filteredHorses.slice(startIndex, endIndex);

  const handleDownloadExcel = () => {
    if (!filteredHorses.length) { alert('No data to download'); return; }
    const data = filteredHorses.map(h => ({
      'Name': h.name,
      'Stable Number': h.stableNumber || '',
      'Gender': h.gender,
      'Breed': h.breed || '',
      'Color': h.color || '',
      'Status': h.status,
      'Manager': h.supervisor?.fullName || '-',
      'Passport No': h.passportNumber || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Horses');
    XLSX.writeFile(wb, `Horses_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (!p.viewHorses) return <Navigate to="/" replace />;

  return (
    <div className="horses-page lovable-page-shell">
      <div className="page-header">
        <div>
          <div className="lovable-header-kicker">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>{t('Stable Command')}</span>
          </div>
          <h1>{t('Horses')}</h1>
          <p className="info-text">
            {canAddHorse 
              ? t('You can add new horses to the system') 
              : t('Only Admin and Instructor can add horses')}
          </p>
        </div>
        <div className="lovable-header-actions">
          {canAddHorse && (
            <button 
              className="btn-add horse-header-action horse-header-add-btn"
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} style={{marginRight:'4px'}} /> {t('Add New Horse')}
            </button>
          )}
        </div>
      </div>

      <div className="directory-kpi-grid">
        <DirectoryMetricCard
          title={t('Total Horses')}
          value={totalHorses}
          subtitle={t('Registered Assets')}
          icon={Link2}
          iconTone="primary"
          subtitleTone="destructive"
          watermark="horse"
          sparkData={horseSpark}
        />
        <DirectoryMetricCard
          title={t('Active')}
          value={activeHorses}
          subtitle={t('Operational')}
          icon={ShieldCheck}
          iconTone="success"
          subtitleTone="success"
          variant="success"
          watermark="horse"
          sparkData={activeSpark}
        />
        <DirectoryMetricCard
          title={t('Assigned')}
          value={assignedHorses}
          subtitle={t('Managed')}
          icon={Users}
          iconTone="primary"
          subtitleTone="primary"
          watermark="horse"
          sparkData={assignedSpark}
        />
        <DirectoryMetricCard
          title={t('Passport Ready')}
          value={passportedHorses}
          subtitle={t('Documentation')}
          icon={FileText}
          iconTone="destructive"
          subtitleTone="destructive"
          variant="alert"
          watermark="horse"
          sparkData={passportSpark}
        />
      </div>

      {/* Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2><Plus size={18} style={{marginRight:'6px',verticalAlign:'middle'}} /> {t('Add New Horse')}</h2>
              <button className="close-btn" onClick={closeModal} aria-label={t('Close')}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddHorse} className="modal-form">
              {/* Photo picker */}
              <div className="add-photo-picker">
                <div className="add-photo-avatar" onClick={() => horseImgRef.current?.click()}>
                  {newHorseImage
                    ? <img src={newHorseImage} alt="preview" className="add-photo-preview" />
                    : <Camera size={32} className="add-photo-placeholder" />
                  }
                  <div className="add-photo-overlay"><Camera size={16} /></div>
                </div>
                <input type="file" ref={horseImgRef} accept="image/*" style={{display:'none'}} onChange={handleHorseImagePick} disabled={loading} />
                <span className="add-photo-label">{newHorseImage ? t('Tap to change photo') : t('Add Photo (optional)')}</span>
              </div>

              <div className="form-group">
                <label htmlFor="name">{t('Horse Name *')}</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  pattern="[A-Za-z\s]*"
                  placeholder="Shadow (letters and spaces only)"
                  required
                  disabled={loading}
                  title="Horse name should only contain letters and spaces"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="gender">{t('Gender *')}</label>
                  <SearchableSelect
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    disabled={loading}
                    options={[
                      { value: 'Stallion', label: 'Stallion' },
                      { value: 'Mare', label: 'Mare' },
                      { value: 'Gelding', label: 'Gelding' },
                      { value: 'Colt', label: 'Colt' },
                      { value: 'Filly', label: 'Filly' },
                      { value: 'Foal', label: 'Foal' },
                      { value: 'Stud', label: 'Stud' },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dateOfBirth">{t('Date of Birth')}</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="breed">{t('Breed')}</label>
                  <input
                    id="breed"
                    type="text"
                    name="breed"
                    value={formData.breed}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="Thoroughbred"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="color">{t('Color')}</label>
                  <input
                    id="color"
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="Black"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="height">{t('Height (hands)')}</label>
                  <input
                    id="height"
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="16.2"
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="stableNumber">{t('Unique Stable Number (Optional)')}</label>
                  <input
                    id="stableNumber"
                    type="text"
                    name="stableNumber"
                    value={formData.stableNumber}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="(ST-09)"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="passportNumber">{t('Horse Passport Number')} <span style={{fontSize:'0.75rem',opacity:0.6}}>({t('Optional')})</span></label>
                <input
                  id="passportNumber"
                  type="text"
                  name="passportNumber"
                  value={formData.passportNumber}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="e.g. GB-2021-001234 (alphanumeric, hyphens, slashes)"
                  maxLength={50}
                  pattern="[A-Za-z0-9][A-Za-z0-9 \-\/]{1,49}"
                  title="Alphanumeric characters, spaces, hyphens and forward slashes only (3–50 characters)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="supervisorId">{t('Assign to Manager')}</label>
                  <SearchableSelect
                    id="supervisorId"
                    name="supervisorId"
                    value={formData.supervisorId}
                    onChange={handleInputChange}
                    placeholder="-- No Assignment --"
                    disabled={loading}
                    options={[
                      { value: '', label: '-- No Assignment --' },
                      ...supervisors.map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))
                    ]}
                  />
                </div>
              </div>

              {message && (
                <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                  {message}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={closeModal}
                  disabled={loading}
                >
                  {t('Cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={loading}
                >
                  {loading ? t('Adding...') : t('Add Horse')}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* My Horses Section - Only for staff roles, not admin/supervisory */}
      {!SUPERVISORY_ROLES.includes(user?.designation) && (
        <div className="team-section">
          <h2>{t('Horses Under My Care')}</h2>
          <div className="horse-directory-toolbar horse-directory-toolbar--subsection">
            <div className="horse-directory-search">
              <Search size={16} className="horse-directory-search-icon" />
              <input
                type="text"
                placeholder={t("Search by name, stable number, breed, color, gender...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="horse-directory-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="horse-directory-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label={t('Clear search')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {filteredMyHorses.length === 0 ? (
            <p className="info-text">
              {searchTerm ? t('No horses match your search') : t('No horses assigned to you')}
            </p>
          ) : (
            <div className="table-scroll-wrap">
            <table className="horses-table">
              <thead>
                <tr>
                  <th>{t('Name')}</th>
                  <th>{t('Passport No')}</th>
                  <th>{t('Stable Number')}</th>
                  <th>{t('Gender')}</th>
                  <th>{t('Breed')}</th>
                  <th>{t('Color')}</th>
                  <th>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyHorses.map((horse) => (
                  <tr key={horse.id} id={`horse-row-${horse.id}`} className={highlightId === horse.id ? 'row-highlight' : ''}>
                    <td>
                      <div className="emp-name-cell">
                        <div
                          className="emp-avatar"
                          onClick={() => horse.profileImage && setLightboxSrc(horse.profileImage)}
                          style={horse.profileImage ? {cursor:'pointer'} : {}}
                        >
                          {horse.profileImage
                            ? <img src={horse.profileImage} alt={horse.name} className="emp-avatar-img" />
                            : <span className="emp-avatar-initials">{(horse.name||'?').charAt(0).toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <span>{horse.name}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{fontFamily:'monospace',fontSize:'0.85rem'}}>{horse.passportNumber || '-'}</td>
                    <td>{horse.stableNumber}</td>
                    <td><span className={`gender-badge gender-${(horse.gender||'').toLowerCase()}`}>{t(horse.gender)}</span></td>
                    <td>{horse.breed ? t(horse.breed) : ''}</td>
                    <td>{horse.color ? t(horse.color) : ''}</td>
                    <td>
                      <span
                        className="horse-status-pill"
                        style={{
                          backgroundColor: getStatusStyle(horse.status).bg,
                          color: getStatusStyle(horse.status).text,
                        }}
                      >
                        <span
                          className="horse-status-dot"
                          style={{ backgroundColor: getStatusStyle(horse.status).dot }}
                        />
                        {t(horse.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      <div className="horses-list">
        <div className="horse-directory-toolbar">
          <div className="horse-directory-search">
            <Search size={16} className="horse-directory-search-icon" />
            <input
              type="text"
              placeholder={t("Search horses by name...")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="horse-directory-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="horse-directory-clear"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                aria-label={t('Clear search')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="horse-directory-action"
            onClick={handleDownloadExcel}
            aria-label={t('Download horses')}
            title={t('Download horses')}
          >
            <Download size={16} />
          </button>
        </div>
        {filteredHorses.length === 0 ? (
          <p className="info-text">
            {searchTerm ? t('No horses match your search') : t('No horses found')}
          </p>
        ) : (
          <>
          <div className="table-scroll-wrap">
          <table className="horses-table">
            <thead>
              <tr>
                <th>{t('Horse Details')}</th>
                <th>{t('Breed')}</th>
                <th>{t('Status')}</th>
                <th className="horse-manager-col">{t('Manager')}</th>
                <th className="horse-performance-col">{t('Performance')}</th>
              </tr>
            </thead>
            <tbody>
                {paginatedHorses.map((horse) => (
                  <tr key={horse.id} id={`horse-row-${horse.id}`} className={highlightId === horse.id ? 'row-highlight' : ''}>
                  <td>
                    <div className="emp-name-cell">
                      <div
                        className="emp-avatar"
                        onClick={() => horse.profileImage && setLightboxSrc(horse.profileImage)}
                        style={horse.profileImage ? {cursor:'pointer'} : {}}
                      >
                        {horse.profileImage
                          ? <img src={horse.profileImage} alt={horse.name} className="emp-avatar-img" />
                          : <span className="emp-avatar-initials">{(horse.name||'?').charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <div className="horse-directory-copy">
                        <span>{horse.name}</span>
                        <small>{`ID: #${getHorseReferenceId(horse)}`}</small>
                      </div>
                    </div>
                  </td>
                  <td>{horse.breed ? t(horse.breed) : ''}</td>
                  <td>
                    <span
                      className="horse-status-pill"
                      style={{
                        backgroundColor: getStatusStyle(horse.status).bg,
                        color: getStatusStyle(horse.status).text,
                      }}
                    >
                      <span
                        className="horse-status-dot"
                        style={{ backgroundColor: getStatusStyle(horse.status).dot }}
                      />
                      {t(horse.status)}
                    </span>
                  </td>
                  <td className="horse-manager-col">
                    {horse.supervisor
                      ? `${horse.supervisor.fullName} (${t(horse.supervisor.designation)})`
                      : '-'
                    }
                  </td>
                  <td className="horse-performance-col"><PerformanceBar value={getHorsePerformance(horse)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(newRows) => {
              setRowsPerPage(newRows);
              setCurrentPage(1);
            }}
            total={filteredHorses.length}
          />
          </>
        )}
      </div>

      {lightboxSrc && ReactDOM.createPortal(
        <div className="lightbox-overlay" onClick={() => setLightboxSrc(null)}>
          <button className="lightbox-close" onClick={() => setLightboxSrc(null)} aria-label={t('Close')}><X size={18} /></button>
          <img src={lightboxSrc} className="lightbox-img" alt="Full view" onClick={e => e.stopPropagation()} />
        </div>
      , document.body)}
    </div>
  );
};

export default HorsesPage;
