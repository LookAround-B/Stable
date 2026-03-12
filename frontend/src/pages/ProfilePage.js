import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Cropper from 'react-easy-crop';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { User, Mail, Lock, Link2, Camera, Settings, Type, Globe } from 'lucide-react';
import { useI18n, LANGUAGES } from '../context/I18nContext';
import useTextSize from '../hooks/useTextSize';

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
      <div className="profile-page">
        <div className="no-user"><p>Please log in to view your profile</p></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Hero Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-bg" />
          <div className="profile-hero-content">
            <div className="profile-avatar-wrap" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-initials">{(user.fullName || 'U').charAt(0).toUpperCase()}</div>
              )}
              <span className={`profile-status-dot ${user.isApproved ? 'online' : 'pending'}`} />
              {/* camera overlay */}
              <div className="profile-avatar-overlay">
                <span className="profile-avatar-camera"><Camera size={15} strokeWidth={2} /></span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
            <div className="profile-hero-info">
              <h1 className="profile-hero-name">{user.fullName || 'User'}</h1>
              <p className="profile-hero-designation">{t(user.designation || 'Staff')}</p>
              <div className="profile-hero-meta">
                <span className={`profile-status-badge ${user.isApproved ? 'approved' : 'pending'}`}>
                  {user.isApproved ? '✔ Approved' : '⧖ Pending Approval'}
                </span>
              </div>
              {uploadMsg && (
                <p style={{ marginTop: 8, fontSize: '.8125rem', color: uploadMsg.startsWith('✓') ? '#10b981' : '#ef4444' }}>
                  {uploadMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="profile-cards-grid">
          <div className="profile-info-card">
            <div className="profile-card-header">
              <span className="profile-card-icon"><User size={15} strokeWidth={2} /></span>
              <h3>Personal Information</h3>
            </div>
            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field-label">Full Name</span>
                <span className="profile-field-value">{user.fullName || '—'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Employee ID</span>
                <span className="profile-field-value profile-field-mono">{user.employeeId || user.id?.slice(0, 8) || '—'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">{t('Designation')}</span>
                <span className="profile-field-value">{user.designation ? t(user.designation) : '—'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">{t('Employment Status')}</span>
                <span className="profile-field-value">{t(user.employmentStatus || 'Active')}</span>
              </div>
            </div>
          </div>

          <div className="profile-info-card">
            <div className="profile-card-header">
              <span className="profile-card-icon"><Mail size={15} strokeWidth={2} /></span>
              <h3>Contact Information</h3>
            </div>
            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field-label">Email Address</span>
                <a href={`mailto:${user.email}`} className="profile-field-value profile-field-link">{user.email || '—'}</a>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Phone Number</span>
                {user.phoneNumber || user.mobile ? (
                  <a href={`tel:${user.phoneNumber || user.mobile}`} className="profile-field-value profile-field-link">
                    {user.phoneNumber || user.mobile}
                  </a>
                ) : (
                  <span className="profile-field-value">—</span>
                )}
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Account Type</span>
                <span className="profile-field-value">{user.googleId ? <><Link2 size={12} style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}} />Google Account</> : <><Lock size={12} style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}} />Email &amp; Password</>}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Horses */}
        {ROLES_WITH_HORSES.includes(user.designation) && (
          <div className="profile-horses-section">
            <div className="profile-card-header">
              <h3>Assigned Horses</h3>
              <span className="profile-horse-count">{assignedHorses.length}</span>
            </div>
            {loading ? (
              <p className="loading">Loading assigned horses...</p>
            ) : assignedHorses.length > 0 ? (
              <div className="profile-horses-grid">
                {assignedHorses.map(horse => (
                  <div key={horse.id} className="profile-horse-card">
                    <div className="profile-horse-details">
                      <div className="profile-horse-name">{horse.name}</div>
                      <div className="profile-horse-meta">
                        <span>Stable #{horse.stableNumber}</span>
                        <span>·</span>
                        <span>{horse.breed ? t(horse.breed) : ''}</span>
                      </div>
                      <span className="profile-horse-role">{horse.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-horses">No horses assigned yet</p>
            )}
          </div>
        )}

        {/* Settings — Text Size */}
        <div className="profile-info-card profile-settings-card">
          <div className="profile-card-header">
            <span className="profile-card-icon"><Settings size={15} strokeWidth={2} /></span>
            <h3>{t('Settings')}</h3>
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
          <div className="language-setting" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,.08)' }}>
            <div className="text-size-label">
              <Globe size={14} strokeWidth={2} />
              <span>{t('Language')}</span>
            </div>
            <div className="text-size-cards" style={{ marginTop: '8px' }}>
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <button
                  key={code}
                  className={`text-size-card${code === lang ? ' text-size-card--active' : ''}`}
                  onClick={() => setLang(code)}
                  type="button"
                  style={{ minWidth: '70px' }}
                >
                  <span className="text-size-card-preview" style={{ fontSize: '0.9rem', fontWeight: 500 }}>{code.toUpperCase()}</span>
                  <span className="text-size-card-label" style={{ fontSize: '0.7rem' }}>{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropOpen && rawImage && ReactDOM.createPortal(
        <div className="crop-modal-overlay" onClick={handleCancelCrop}>
          <div className="crop-modal" onClick={e => e.stopPropagation()}>
            <div className="crop-modal-header">
              <h3>Adjust your photo</h3>
              <button className="crop-close-btn" onClick={handleCancelCrop}>✕</button>
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
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="crop-zoom-slider"
              />
            </div>
            <div className="crop-modal-actions">
              <button className="btn-secondary" onClick={handleCancelCrop} disabled={uploading}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveCrop} disabled={uploading}>
                {uploading ? 'Saving…' : 'Apply Photo'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default ProfilePage;

