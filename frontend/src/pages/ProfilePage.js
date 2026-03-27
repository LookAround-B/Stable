import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Cropper from 'react-easy-crop';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { User, Mail, Lock, Link2, Camera, Settings, Type, Globe, Download, Share, Plus, X } from 'lucide-react';
import { useI18n, LANGUAGES } from '../context/I18nContext';
import useTextSize from '../hooks/useTextSize';
import usePwaInstall from '../hooks/usePwaInstall';

const ROLES_WITH_HORSES = [
  'Groom', 'Riding Boy', 'Rider', 'Jamedar', 'Instructor', 'Stable Manager', 'Ground Supervisor'
];

/* ── helper: crop image via canvas ── */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });

async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const SIZE = 400;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  // draw circular clip
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    image,
    croppedAreaPixels.x, croppedAreaPixels.y,
    croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0, SIZE, SIZE
  );
  return canvas.toDataURL('image/jpeg', 0.88);
}

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { textSize, setTextSize } = useTextSize();
  const { canInstall, isInstalled, install, showIosModal, dismiss } = usePwaInstall();
  const [assignedHorses, setAssignedHorses] = useState([]);
  const [loading, setLoading] = useState(false);

  /* crop state */
  const fileInputRef = useRef(null);
  const [rawImage, setRawImage]         = useState(null); // object URL
  const [cropOpen, setCropOpen]         = useState(false);
  const [crop, setCrop]                 = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                 = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadMsg, setUploadMsg]       = useState('');

  const loadAssignedHorses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/horse-care-team');
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      const userAssignments = data.filter(a => a.staffId === user?.id);
      setAssignedHorses(userAssignments.map(a => ({
        id: a.horseId,
        name: a.horse?.name || 'Unknown',
        role: a.role,
        breed: a.horse?.breed || '-',
        stableNumber: a.horse?.stableNumber || '-',
      })));
    } catch {
      setAssignedHorses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && ROLES_WITH_HORSES.includes(user.designation)) loadAssignedHorses();
  }, [user, loadAssignedHorses]);

  /* file selected */
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawImage(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(true);
    e.target.value = '';
  };

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  /* save cropped image */
  const handleSaveCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      setUploading(true);
      setUploadMsg('');
      const base64 = await getCroppedImg(rawImage, croppedAreaPixels);

      // PUT to backend — send profileImage alongside current data so validation passes
      const response = await apiClient.put('/employees/profile-update', {
        fullName:    user.fullName    || '',
        phoneNumber: user.phoneNumber || '',
        designation: user.designation || '',
        profileImage: base64,
      });

      const updated = response.data?.user || response.data;
      updateUser({ profileImage: updated.profileImage || base64 });
      setCropOpen(false);
      URL.revokeObjectURL(rawImage);
      setRawImage(null);
      setUploadMsg('✓ Profile photo updated!');
      setTimeout(() => setUploadMsg(''), 3000);
    } catch (err) {
      setUploadMsg('✗ Failed to save. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelCrop = () => {
    setCropOpen(false);
    if (rawImage) { URL.revokeObjectURL(rawImage); setRawImage(null); }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground text-center py-12">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Hero Card */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden relative">
        <div className="h-28 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="relative shrink-0 cursor-pointer group" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
            <div className="w-24 h-24 rounded-full border-4 border-surface-container-highest overflow-hidden bg-surface-container-high flex items-center justify-center">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">{(user.fullName || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-surface-container-highest ${user.isApproved ? 'bg-success' : 'bg-warning'}`} />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{user.fullName || 'User'}</h1>
            <p className="text-sm text-muted-foreground">{t(user.designation || 'Staff')}</p>
            <div className="mt-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${user.isApproved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                {user.isApproved ? '✔ APPROVED' : '⧖ PENDING APPROVAL'}
              </span>
            </div>
            {uploadMsg && (
              <p className={`mt-2 text-xs font-medium ${uploadMsg.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>{uploadMsg}</p>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><User size={15} className="text-primary" /></span>
            <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Full Name</span>
              <span className="text-sm text-foreground font-medium">{user.fullName || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Employee ID</span>
              <span className="text-sm text-foreground mono-data">{user.employeeId || user.id?.slice(0, 8) || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('Designation')}</span>
              <span className="text-sm text-foreground font-medium">{user.designation ? t(user.designation) : '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('Employment Status')}</span>
              <span className="text-sm text-foreground font-medium">{t(user.employmentStatus || 'Active')}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><Mail size={15} className="text-primary" /></span>
            <h3 className="text-sm font-bold text-foreground">Contact Information</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email Address</span>
              <a href={`mailto:${user.email}`} className="text-sm text-primary hover:underline">{user.email || '—'}</a>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Phone Number</span>
              {user.phoneNumber || user.mobile ? (
                <a href={`tel:${user.phoneNumber || user.mobile}`} className="text-sm text-primary hover:underline">{user.phoneNumber || user.mobile}</a>
              ) : <span className="text-sm text-foreground">—</span>}
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Account Type</span>
              <span className="text-sm text-foreground font-medium flex items-center gap-1">{user.googleId ? <><Link2 size={12} />Google Account</> : <><Lock size={12} />Email &amp; Password</>}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Horses */}
      {ROLES_WITH_HORSES.includes(user.designation) && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Assigned Horses</h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-primary/15 text-primary">{assignedHorses.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading assigned horses...</p>
          ) : assignedHorses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignedHorses.map(horse => (
                <div key={horse.id} className="p-4 rounded-lg bg-surface-container-high border border-border/30 hover:border-primary/20 transition-colors">
                  <p className="text-sm font-semibold text-foreground">{horse.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Stable #{horse.stableNumber} · {horse.breed ? t(horse.breed) : ''}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-primary/15 text-primary">{horse.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No horses assigned yet</p>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><Settings size={15} className="text-primary" /></span>
          <h3 className="text-sm font-bold text-foreground">{t('Settings')}</h3>
        </div>
        <div className="text-size-setting">
          <div className="text-size-label">
            <Type size={14} strokeWidth={2} />
            <span>{t('Text Size')}</span>
          </div>
          <div className="text-size-cards">
            {[
              { key: 'small',  label: 'A',  desc: t('Small') },
              { key: 'medium', label: 'A',  desc: t('Medium') },
              { key: 'large',  label: 'A',  desc: t('Large') },
            ].map(opt => (
              <button
                key={opt.key}
                className={`text-size-card text-size-card--${opt.key}${textSize === opt.key ? ' text-size-card--active' : ''}`}
                onClick={() => setTextSize(opt.key)}
                type="button"
              >
                <span className="text-size-card-preview">{opt.label}</span>
                <span className="text-size-card-label">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Switcher */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-size-label">
            <Globe size={14} strokeWidth={2} />
            <span>{t('Language')}</span>
          </div>
          <div className="language-cards mt-2">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <button
                key={code}
                className={`text-size-card${code === lang ? ' text-size-card--active' : ''}`}
                onClick={() => setLang(code)}
                type="button"
              >
                <span className="text-size-card-preview" style={{ fontSize: '0.9rem', fontWeight: 500 }}>{code.toUpperCase()}</span>
                <span className="text-size-card-label" style={{ fontSize: '0.7rem' }}>{name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Install App */}
      <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><Download size={15} className="text-primary" /></span>
          <h3 className="text-sm font-bold text-foreground">{t('Install App')}</h3>
        </div>
        {isInstalled ? (
          <div className="flex items-center gap-2 text-sm text-success font-medium">
            <span>✓</span> <span>App is installed on your device</span>
          </div>
        ) : canInstall ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Install EFM Stable for quick access, offline support, and a native app experience.</p>
            <button className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2" onClick={install} type="button">
              <Download size={16} /> Install App
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">App install is not available on this browser</p>
        )}
      </div>

      {/* iOS Install Modal */}
      {showIosModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={dismiss}>
          <div className="bg-surface-container-highest rounded-xl p-6 w-[340px] edge-glow border border-border" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" onClick={dismiss}><X size={18} /></button>
            <div className="flex justify-center mb-3">
              <img src="/fav.png" alt="EFM" className="w-12 h-12 rounded-xl" />
            </div>
            <h3 className="text-lg font-bold text-foreground text-center">Install EFM Stable</h3>
            <p className="text-xs text-muted-foreground text-center mt-1 mb-4">Add to your home screen for the best experience</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">1</span>
                <span className="text-sm text-foreground">Tap the <strong>Share</strong> button</span>
                <Share size={16} className="ml-auto text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-sm text-foreground">Scroll down and tap <strong>Add to Home Screen</strong></span>
                <Plus size={16} className="ml-auto text-muted-foreground" />
              </div>
            </div>
            <button className="w-full mt-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all" onClick={dismiss}>Got it</button>
          </div>
        </div>
      , document.body)}

      {/* Crop Modal */}
      {cropOpen && rawImage && ReactDOM.createPortal(
        <div className="crop-modal-overlay" onClick={handleCancelCrop}>
          <div className="crop-modal" onClick={e => e.stopPropagation()}>
            <div className="crop-modal-header">
              <h3>Adjust your photo</h3>
              <button className="crop-close-btn" onClick={handleCancelCrop} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="crop-area">
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="crop-zoom-row">
              <span className="crop-zoom-label">Zoom</span>
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="crop-zoom-slider" />
            </div>
            <div className="crop-modal-actions">
              <button className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors" onClick={handleCancelCrop} disabled={uploading}>Cancel</button>
              <button className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all" onClick={handleSaveCrop} disabled={uploading}>
                {uploading ? 'Saving...' : 'Apply Photo'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default ProfilePage;

