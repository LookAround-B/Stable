import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Camera, Download, Search, X } from 'lucide-react';
import { FaHorse } from 'react-icons/fa';
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
  const assignmentRate = totalHorses > 0 ? Math.round((assignedHorses / totalHorses) * 100) : 0;

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
              className="btn-add" 
              onClick={() => setShowModal(true)}
            >
              <FaHorse style={{marginRight:'4px'}} /> {t('Add New Horse')}
            </button>
          )}
          <div className="lovable-command-chip">
            <div className="lovable-command-ring">{assignmentRate}%</div>
            <div className="lovable-command-copy">
              <strong>{t('Stable Assignment')}</strong>
              <span>{t('Managed Coverage')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lovable-metric-strip">
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Total Horses')}</div>
          <div className="lovable-metric-card-value">{totalHorses}</div>
          <div className="lovable-metric-card-sub">{t('Horses currently registered in the facility')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Active')}</div>
          <div className="lovable-metric-card-value">{activeHorses}</div>
          <div className="lovable-metric-card-sub">{t('Horses marked active and operational')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Assigned')}</div>
          <div className="lovable-metric-card-value">{assignedHorses}</div>
          <div className="lovable-metric-card-sub">{t('Already attached to a manager or supervisor')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Passport Ready')}</div>
          <div className="lovable-metric-card-value">{passportedHorses}</div>
          <div className="lovable-metric-card-sub">{t('Records carrying passport information')}</div>
        </div>
      </div>

      {/* Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2><FaHorse style={{marginRight:'6px',verticalAlign:'middle'}} /> {t('Add New Horse')}</h2>
              <button className="close-btn" onClick={closeModal} aria-label={t('Close')}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddHorse} className="modal-form">
              {/* Photo picker */}
              <div className="add-photo-picker">
                <div className="add-photo-avatar" onClick={() => horseImgRef.current?.click()}>
                  {newHorseImage
                    ? <img src={newHorseImage} alt="preview" className="add-photo-preview" />
                    : <FaHorse className="add-photo-placeholder" style={{fontSize:'48px'}} />
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
          <div className="search-bar" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--lovable-text-soft)', pointerEvents: 'none', zIndex: 1 }} />
            <input
              type="text"
              placeholder={t("Search by name, stable number, breed, color, gender...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ paddingLeft: '40px' }}
            />
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
                    <td><span className="status-badge">{t(horse.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      <div className="horses-list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>{t('All Horses')}</h2>
          <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
        </div>
        <div className="search-bar" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--lovable-text-soft)', pointerEvents: 'none', zIndex: 1 }} />
          <input
            type="text"
            placeholder={t("Search by name, stable number, breed, color, gender...")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
            style={{ paddingLeft: '40px' }}
          />
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
                <th>{t('Name')}</th>
                <th>{t('Passport No')}</th>
                <th>{t('Stable Number')}</th>
                <th>{t('Gender')}</th>
                <th>{t('Breed')}</th>
                <th>{t('Color')}</th>
                <th>{t('Manager')}</th>
                <th>{t('Status')}</th>
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
                      <span>{horse.name}</span>
                    </div>
                  </td>
                  <td style={{fontFamily:'monospace',fontSize:'0.85rem'}}>{horse.passportNumber || '-'}</td>
                  <td>{horse.stableNumber}</td>
                  <td><span className={`gender-badge gender-${(horse.gender||'').toLowerCase()}`}>{t(horse.gender)}</span></td>
                  <td>{horse.breed ? t(horse.breed) : ''}</td>
                  <td>{horse.color ? t(horse.color) : ''}</td>
                  <td>
                    {horse.supervisor
                      ? `${horse.supervisor.fullName} (${t(horse.supervisor.designation)})`
                      : '-'
                    }
                  </td>
                  <td><span className="status-badge">{t(horse.status)}</span></td>
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
