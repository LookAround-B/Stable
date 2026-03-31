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
import DatePicker from '../components/shared/DatePicker';
import { showNoExportDataToast } from '../lib/exportToast';
import ExportDialog from '../components/shared/ExportDialog';
import { downloadCsvFile } from '../lib/csvExport';

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

const HORSE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Horses' },
  { value: 'active', label: 'Active' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'passport', label: 'Passport Ready' },
];


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
  const [horseFilter, setHorseFilter] = useState('all');
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

  // Filter horses based on search term
  const filteredHorses = horses.filter((horse) => {
    const matchesSearch =
      horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (horse.breed && horse.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (horse.color && horse.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (horse.gender && horse.gender.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (horse.stableNumber && horse.stableNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) {
      return false;
    }

    if (horseFilter === 'active') {
      return (horse.status || '').toLowerCase() === 'active';
    }

    if (horseFilter === 'assigned') {
      return Boolean(horse.supervisorId || horse.supervisor);
    }

    if (horseFilter === 'passport') {
      return Boolean(horse.passportNumber);
    }

    return true;
  });

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

  const getExportRows = () => filteredHorses.map(h => ({
      'Name': h.name,
      'Stable Number': h.stableNumber || '',
      'Gender': h.gender,
      'Breed': h.breed || '',
      'Color': h.color || '',
      'Status': h.status,
      'Manager': h.supervisor?.fullName || '-',
      'Passport No': h.passportNumber || '',
    }));

  const handleDownloadExcel = () => {
    if (!filteredHorses.length) { showNoExportDataToast('No data to download'); return; }
    const data = getExportRows();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Horses');
    XLSX.writeFile(wb, `Horses_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleDownloadCSV = () => {
    if (!filteredHorses.length) { showNoExportDataToast('No data to download'); return; }
    downloadCsvFile(getExportRows(), `Horses_${new Date().toISOString().slice(0,10)}.csv`);
  };

  if (!p.viewHorses) return <Navigate to="/dashboard" replace />;

  return (
    <div className="horses-page space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4">
          <div className="flex-1">
            <div className="lovable-header-kicker mb-2">
              <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
              <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
              <span>FLEET MANAGEMENT</span>
            </div>
            <div className="horses-header-row flex items-end justify-between gap-3">
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">Horses</h1>
              {canAddHorse && (
                <button onClick={() => setShowModal(true)} className="horses-header-add-btn inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:brightness-110 transition-all sm:h-10 sm:px-5 w-fit whitespace-nowrap shrink-0">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add New Horse
                </button>
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {canAddHorse 
                ? t('You can add new horses to the system') 
                : t('Only Admin and Instructor can add horses')}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-lovable">
        <div className="dashboard-lovable-card-grid directory-kpi-grid">
          <DirectoryMetricCard
            title="Total Horses"
            value={totalHorses}
            subtitle="Registered Assets"
            icon={Link2}
            sparkData={horseSpark}
            watermark="horse"
            iconTone="primary"
            subtitleTone="destructive"
          />
          <DirectoryMetricCard
            title="Active Horses"
            value={activeHorses}
            subtitle="Stable Ready"
            icon={ShieldCheck}
            sparkData={activeSpark}
            watermark="horse"
            iconTone="success"
            subtitleTone="success"
            variant="success"
          />
          <DirectoryMetricCard
            title="Assigned Horses"
            value={assignedHorses}
            subtitle="Manager Linked"
            icon={Users}
            sparkData={assignedSpark}
            watermark="horse"
            iconTone="primary"
            subtitleTone="primary"
          />
          <DirectoryMetricCard
            title="Passport Ready"
            value={passportedHorses}
            subtitle="Travel Cleared"
            icon={FileText}
            sparkData={passportSpark}
            watermark="horse"
            iconTone="destructive"
            subtitleTone="destructive"
            variant="alert"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface-container-highest rounded-[18px] edge-glow overflow-hidden">
        {/* Toolbar */}
        <div className="horse-directory-toolbar flex flex-row items-center gap-2 sm:gap-3 p-3 sm:p-5 border-b border-border">
          <div className="horse-directory-search flex-1 min-w-0 md:flex-none md:w-[360px]">
            <Search className="horse-directory-search-icon w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <input
              type="text"
              placeholder={t("Search horses...")}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="horse-directory-search-input"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="horse-directory-clear">
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </div>
          <div className="horse-directory-toolbar-actions md:ml-auto">
            <SearchableSelect
              name="horseFilter"
              value={horseFilter}
              onChange={(e) => {
                setHorseFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={HORSE_FILTER_OPTIONS}
              className="horse-directory-filter shrink-0"
              searchable={false}
            />
            <ExportDialog
              title="Export Horses"
              options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
              trigger={(
                <button
                  className="btn-download horse-directory-export shrink-0"
                  title={t('Export horses')}
                  type="button"
                  aria-label={t('Export horses')}
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            />
          </div>
        </div>

        {filteredHorses.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">{searchTerm ? t('No horses match your search') : t('No horses found')}</p>
        ) : (
          <>
            <div className="table-scroll-wrap overflow-x-auto">
              <table className="horses-table w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Horse Details</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Breed</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Manager</th>
                    {/* <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Performance</th> */}
                  </tr>
                </thead>
                <tbody>
                  {paginatedHorses.map(horse => {
                    const initials = (horse.name || '?').charAt(0).toUpperCase();
                    const statusStyle = getStatusStyle(horse.status);
                    return (
                      <tr key={horse.id} id={`horse-row-${horse.id}`} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${highlightId === horse.id ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => horse.profileImage && setLightboxSrc(horse.profileImage)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${horse.profileImage ? 'cursor-pointer' : 'bg-primary/15'}`}
                            >
                              {horse.profileImage ? (
                                <img src={horse.profileImage} alt={horse.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-primary">{initials}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{horse.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{`ID: #${getHorseReferenceId(horse)}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-muted-foreground">{horse.breed ? t(horse.breed) : '-'}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusStyle.dot }} />
                            {t(horse.status)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-muted-foreground hidden lg:table-cell">
                          {horse.supervisor ? `${horse.supervisor.fullName} (${t(horse.supervisor.designation)})` : '-'}
                        </td>
                        {/* <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                          <PerformanceBar value={getHorsePerformance(horse)} />
                        </td> */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
                total={filteredHorses.length}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto px-4 pb-4 pt-[72px] sm:p-6 bg-background/80 backdrop-blur-sm">
          <div className="my-auto bg-surface-container-highest rounded-xl border border-border w-full max-w-lg overflow-hidden flex flex-col max-h-[calc(100dvh-5.5rem)] sm:max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground inline-flex items-center gap-2"><Plus className="w-5 h-5" /> {t('Add New Horse')}</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-container-high transition-colors text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
              <form onSubmit={handleAddHorse} className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div
                    onClick={() => horseImgRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-surface-container-high flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden group relative"
                  >
                    {newHorseImage ? (
                      <img src={newHorseImage} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <input type="file" ref={horseImgRef} accept="image/*" className="hidden" onChange={handleHorseImagePick} disabled={loading} />
                  <span className="text-xs text-muted-foreground">{newHorseImage ? t('Tap to change') : t('Add Photo (optional)')}</span>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Horse Name *')}</label>
                  <input id="name" type="text" name="name" value={formData.name} onChange={handleInputChange} pattern="[A-Za-z\s]*" placeholder="Shadow (letters and spaces only)" required disabled={loading} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Gender *')}</label>
                    <SearchableSelect id="gender" name="gender" value={formData.gender} onChange={handleInputChange} disabled={loading} options={[{ value: 'Stallion', label: 'Stallion' }, { value: 'Mare', label: 'Mare' }, { value: 'Gelding', label: 'Gelding' }, { value: 'Colt', label: 'Colt' }, { value: 'Filly', label: 'Filly' }, { value: 'Foal', label: 'Foal' }, { value: 'Stud', label: 'Stud' }]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Date of Birth')}</label>
                    <DatePicker value={formData.dateOfBirth} onChange={(val) => handleInputChange({ target: { name: 'dateOfBirth', value: val } })} disabled={loading} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Breed')}</label>
                    <input id="breed" type="text" name="breed" value={formData.breed} onChange={handleInputChange} disabled={loading} placeholder="Thoroughbred" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Color')}</label>
                    <input id="color" type="text" name="color" value={formData.color} onChange={handleInputChange} disabled={loading} placeholder="Black" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Height (hands)')}</label>
                    <input id="height" type="number" name="height" value={formData.height} onChange={handleInputChange} disabled={loading} placeholder="16.2" step="0.1" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Unique Stable Number')}</label>
                    <input id="stableNumber" type="text" name="stableNumber" value={formData.stableNumber} onChange={handleInputChange} disabled={loading} placeholder="(Optional, e.g. ST-09)" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Horse Passport Number')} <span className="opacity-60">({t('Optional')})</span></label>
                  <input id="passportNumber" type="text" name="passportNumber" value={formData.passportNumber} onChange={handleInputChange} disabled={loading} placeholder="e.g. GB-2021-001234" maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9 \-\/]{1,49}" title="Alphanumeric, spaces, hyphens and slashes only (3–50 chars)" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Assign to Manager')}</label>
                  <SearchableSelect id="supervisorId" name="supervisorId" value={formData.supervisorId} onChange={handleInputChange} placeholder="-- No Assignment --" disabled={loading} options={[{ value: '', label: '-- No Assignment --' }, ...supervisors.map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))]} />
                </div>

                {message && (
                  <div className={`mt-4 px-3 py-2 rounded-lg text-sm font-medium ${message.includes('Error') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
                    {message}
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 sm:p-6 border-t border-border flex justify-end gap-3 bg-surface-container-high/50">
              <button type="button" onClick={closeModal} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-highest transition-colors">{t('Cancel')}</button>
              <button onClick={handleAddHorse} disabled={loading} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">{loading ? t('Adding...') : t('Add Horse')}</button>
            </div>
          </div>
        </div>
      , document.body)}

      {lightboxSrc && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-4" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 p-2 bg-surface-container-high rounded-full hover:bg-border transition-colors text-foreground"><X size={20} /></button>
          <img src={lightboxSrc} className="max-w-full max-h-full rounded-lg object-contain" alt="Full view" onClick={e => e.stopPropagation()} />
        </div>
      , document.body)}
    </div>
  );
};

export default HorsesPage;
