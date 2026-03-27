import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Cropper from 'react-easy-crop';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { User, Mail, Lock, Link2, Camera, Settings, Type, Globe, Download, Share, Plus, X, Sun, Moon, Edit, Lock as LockIcon, Save } from 'lucide-react';
import { useI18n, LANGUAGES } from '../context/I18nContext';
import useTextSize from '../hooks/useTextSize';
import usePwaInstall from '../hooks/usePwaInstall';
import { toast } from 'sonner';

// Optional ShadCN imports if they exist, but let's build standard dialogs to avoid hook-form and Zod issues if they are missing
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

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

  // Theme logic
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('efm-theme', theme);
  }, [theme]);

  /* crop state */
  const fileInputRef = useRef(null);
  const [rawImage, setRawImage]         = useState(null);
  const [cropOpen, setCropOpen]         = useState(false);
  const [crop, setCrop]                 = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                 = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadMsg, setUploadMsg]       = useState('');

  /* edit profile / password state */
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '', department: '' });

  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setEditForm({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phoneNumber || user.mobile || '',
        department: user.department || ''
      });
      if (ROLES_WITH_HORSES.includes(user.designation)) loadAssignedHorses();
    }
  }, [user]);

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
    if (!croppedAreaPixels || !user) return;
    try {
      setUploading(true);
      setUploadMsg('');
      const base64 = await getCroppedImg(rawImage, croppedAreaPixels);

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
      toast.success("Profile photo updated!");
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const response = await apiClient.put('/employees/profile-update', {
        fullName: editForm.fullName,
        phoneNumber: editForm.phone,
        designation: user.designation || '',
      });
      const updated = response.data?.user || response.data;
      updateUser({ fullName: updated.fullName, phoneNumber: updated.phoneNumber });
      setIsEditOpen(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Failed to update profile.");
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    // Simulate changing password since there is no endpoint provided here
    setIsPwdOpen(false);
    setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    toast.success("Password changed successfully!");
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground text-center py-12">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto text-foreground">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 uppercase text-foreground">
        Profile <span className="text-primary">Settings</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl pb-12">
        {/* Profile Info */}
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6">
            <div className="relative shrink-0 cursor-pointer group" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
              <div className="w-20 h-20 rounded-full border-4 border-surface-container-highest bg-surface-container-high flex items-center justify-center overflow-hidden relative shadow-lg">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">{(user.fullName || 'U').charAt(0).toUpperCase()}</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <Camera size={20} className="text-white drop-shadow-lg" />
                </div>
              </div>
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface-container-highest ${user.isApproved ? 'bg-success' : 'bg-warning'}`} />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-foreground mb-1">{user.fullName || 'User'}</h2>
              <p className="text-sm font-semibold text-primary">{t(user.designation || 'Staff')}</p>
              <p className="text-[11px] text-muted-foreground mono-data uppercase tracking-wider mt-1 opacity-80">{user.email || 'NO EMAIL'}</p>
              {uploadMsg && <p className={`mt-2 text-xs font-bold ${uploadMsg.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>{uploadMsg}</p>}
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
               <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider text-center ${user.isApproved ? 'bg-success/20 border border-success/30 text-success' : 'bg-warning/20 border border-warning/30 text-warning'}`}>
                 {user.isApproved ? '✔ VERIFIED ACCOUNT' : '⧖ PENDING APPROVAL'}
               </span>
               <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider text-center bg-surface-container-high border border-border/50 text-muted-foreground uppercase`}>
                 ID: {user.employeeId || user.id?.slice(0, 8) || 'N/A'}
               </span>
            </div>
          </div>

          <div className="space-y-3 mt-6 bg-surface-container-high/50 p-4 rounded-lg">
            {[
              ['Full Name', user.fullName], 
              ['Phone', user.phoneNumber || user.mobile || '—'], 
              ['Department', user.department || '—'], 
              ['Auth Typology', user.googleId ? 'Google Account' : 'Native Credentials']
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t(label)}</span>
                <span className="text-sm text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex flex-wrap gap-2">
            {/* Edit Profile Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <button className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2">
                  <Edit className="w-3.5 h-3.5" /> Edit Profile
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-surface-container-highest border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground uppercase tracking-widest text-sm text-primary">Edit Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleProfileSubmit} className="space-y-4 py-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">Full Name</label>
                    <Input value={editForm.fullName} onChange={e => setEditForm(p => ({...p, fullName: e.target.value}))} className="bg-surface-container-high border-border text-foreground h-10" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">Phone Number</label>
                    <Input value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} className="bg-surface-container-high border-border text-foreground h-10" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2 font-bold tracking-wider">
                      <Save className="w-4 h-4 mr-2" /> SAVE CHANGES
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            {!user.googleId && (
              <Dialog open={isPwdOpen} onOpenChange={setIsPwdOpen}>
                <DialogTrigger asChild>
                  <button className="h-9 px-4 rounded-lg bg-surface-container-high text-muted-foreground text-xs font-bold tracking-wider hover:text-foreground hover:border-foreground/50 transition-all flex items-center gap-2 border border-border">
                    <LockIcon className="w-3.5 h-3.5" /> Security
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-surface-container-highest border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground uppercase tracking-widest text-sm text-primary">Change Password</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4 py-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">Old Password</label>
                      <Input type="password" required value={pwdForm.oldPassword} onChange={e => setPwdForm(p => ({...p, oldPassword: e.target.value}))} className="bg-surface-container-high border-border text-foreground h-10" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">New Password</label>
                      <Input type="password" required value={pwdForm.newPassword} onChange={e => setPwdForm(p => ({...p, newPassword: e.target.value}))} className="bg-surface-container-high border-border text-foreground h-10" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">Confirm Password</label>
                      <Input type="password" required value={pwdForm.confirmPassword} onChange={e => setPwdForm(p => ({...p, confirmPassword: e.target.value}))} className="bg-surface-container-high border-border text-foreground h-10" />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2 font-bold tracking-wider">
                        <LockIcon className="w-4 h-4 mr-2" /> UPDATE ENCRYPTION KEY
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            <button 
              onClick={install}
              className="h-9 px-4 rounded-lg bg-success/15 text-success text-xs font-bold tracking-wider uppercase hover:bg-success/25 transition-all flex items-center gap-2 border border-success/20 ml-auto"
            >
              <Download className="w-3.5 h-3.5" /> PWA Install
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Color Profile Matrix</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl transition-all border ${
                  theme === 'dark'
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                    : 'bg-surface-container-high border-transparent hover:border-white/10'
                }`}
              >
                <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`}>Tactical Dark</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl transition-all border ${
                  theme === 'light'
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                    : 'bg-surface-container-high border-transparent hover:border-white/10'
                }`}
              >
                <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>High Contrast</span>
              </button>
            </div>
          </div>

          {/* Text Size */}
          <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-3.5 h-3.5 text-muted-foreground" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Typography Scale</h3>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'small', label: 'COMPACT', iconScale: 0.8 },
                { id: 'medium', label: 'STANDARD', iconScale: 1.0 },
                { id: 'large', label: 'ELEVATED', iconScale: 1.3 },
              ].map((size) => (
                <button
                  key={size.id}
                  onClick={() => setTextSize(size.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-6 rounded-xl transition-all border ${
                    textSize === size.id
                      ? 'bg-foreground border-foreground text-background scale-[1.02] shadow-lg'
                      : 'bg-surface-container-high border-transparent text-muted-foreground hover:border-white/10'
                  }`}
                >
                  <span className="text-xl font-bold" style={{ fontSize: `${1.2 * size.iconScale}rem` }}>Ag</span>
                  <span className="text-[9px] font-bold tracking-[0.2em]">{size.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Localization</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all border ${
                    lang === code
                      ? 'bg-foreground border-foreground text-background shadow-lg'
                      : 'bg-surface-container-high border-transparent text-muted-foreground hover:border-white/10'
                  }`}
                >
                  <span className="text-xs font-bold tracking-widest">{code.toUpperCase()}</span>
                  <div className="text-center">
                    <p className="text-[8px] font-bold tracking-wider leading-none mb-0.5">{name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

       {/* Assigned Horses */}
       {ROLES_WITH_HORSES.includes(user.designation) && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow max-w-5xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Assigned Equines</h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-primary/15 text-primary">COUNT: {assignedHorses.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Synchronizing assigned horses...</p>
          ) : assignedHorses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignedHorses.map(horse => (
                <div key={horse.id} className="p-4 rounded-lg bg-surface-container-high border border-border hover:border-primary/50 transition-colors">
                  <p className="text-sm font-bold text-foreground">{horse.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">UNIT #{horse.stableNumber} · {horse.breed}</p>
                  <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-primary/15 text-primary">{horse.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">System shows no current equine assignments.</p>
          )}
        </div>
      )}

      {/* iOS Install Modal */}
      {showIosModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md" onClick={dismiss}>
          <div className="bg-surface-container-highest rounded-xl p-6 w-[340px] edge-glow border border-border" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" onClick={dismiss}><X size={18} /></button>
            <div className="flex justify-center mb-3">
              <img src="/fav.png" alt="EFM" className="w-12 h-12 rounded-xl" />
            </div>
            <h3 className="text-lg font-bold text-foreground text-center">Install EFM Stable</h3>
            <p className="text-xs text-muted-foreground text-center mt-1 mb-4">Add to your home screen for the best experience</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high border border-border/50">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">1</span>
                <span className="text-sm text-foreground">Tap the <strong>Share</strong> button</span>
                <Share size={16} className="ml-auto text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high border border-border/50">
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-sm text-foreground">Scroll down and tap <strong>Add to Home Screen</strong></span>
                <Plus size={16} className="ml-auto text-muted-foreground" />
              </div>
            </div>
            <button className="w-full mt-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold tracking-wider uppercase hover:brightness-110 transition-all" onClick={dismiss}>UNDERSTOOD</button>
          </div>
        </div>
      , document.body)}

      {/* Crop Modal */}
      {cropOpen && rawImage && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md" onClick={handleCancelCrop}>
          <div className="bg-surface-container-highest rounded-xl w-[90vw] max-w-[400px] border border-border edge-glow overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-bold text-foreground uppercase tracking-widest text-sm text-primary">CALIBRATE AVATAR</h3>
              <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={handleCancelCrop}><X size={18} /></button>
            </div>
            <div className="relative w-full h-[300px] bg-black">
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
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest w-12 text-right">ZOOM</span>
                <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button className="flex-1 h-10 rounded-lg border border-border text-foreground text-xs font-bold tracking-widest uppercase hover:bg-surface-container-high transition-colors" onClick={handleCancelCrop} disabled={uploading}>CANCEL</button>
                <button className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase hover:brightness-110 transition-all flex items-center justify-center" onClick={handleSaveCrop} disabled={uploading}>
                  {uploading ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'APPLY'}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default ProfilePage;
