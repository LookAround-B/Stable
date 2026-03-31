import React, { useState } from 'react';
import { createProfile, setToken } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { User, Camera } from 'lucide-react';
import SelectField from '../components/shared/SelectField';

const DESIGNATIONS = ['Groomer', 'Zamindar', 'Instructor', 'Admin', 'Health Advisor', 'Super Admin'];

const inp = 'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none disabled:opacity-50';
const lbl = 'text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5';

const ProfileSetupPage = () => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    fullName: '', phoneNumber: '', designation: 'Groomer', profileImage: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setFormData((prev) => ({ ...prev, profileImage: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const data = new FormData();
      data.append('fullName', formData.fullName);
      data.append('phoneNumber', formData.phoneNumber);
      data.append('designation', formData.designation);
      if (formData.profileImage) data.append('profileImage', formData.profileImage);
      const response = await createProfile(data);
      setToken(response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Profile setup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-container-highest rounded-xl border border-border p-8 edge-glow">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("Complete Your Profile")}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t("Set up your account details to continue")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className={lbl}>{t("Full Name *")}</label>
              <input
                id="fullName" type="text" name="fullName" value={formData.fullName}
                onChange={handleInputChange} pattern="[A-Za-z\s]*"
                placeholder={t("Enter your full name (letters and spaces only)")}
                required disabled={loading}
                title="Name should only contain letters and spaces"
                className={inp}
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className={lbl}>{t("Phone Number *")}</label>
              <input
                id="phoneNumber" type="tel" name="phoneNumber" value={formData.phoneNumber}
                onChange={handleInputChange} inputMode="numeric" maxLength="10"
                pattern="[0-9]*" placeholder={t("Enter 10-digit phone number")}
                required disabled={loading}
                title="Phone number should contain only 10 digits"
                className={inp}
              />
            </div>

            <div>
              <label htmlFor="designation" className={lbl}>{t("Role/Designation *")}</label>
              <SelectField
                value={formData.designation}
                onChange={(val) => handleInputChange({ target: { name: 'designation', value: val } })}
                options={DESIGNATIONS}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="profileImage" className={lbl}>{t("Profile Picture")}</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border bg-surface-container-high flex items-center justify-center cursor-pointer hover:border-primary transition-colors shrink-0 overflow-hidden" onClick={() => document.getElementById('profileImage').click()}>
                  <Camera className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {formData.profileImage ? formData.profileImage.name : 'No file selected'}
                </div>
              </div>
              <input id="profileImage" type="file" accept="image/*" onChange={handleImageChange} disabled={loading} className="hidden" />
            </div>

            {error && <div className="p-3 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 text-sm font-medium">{error}</div>}

            <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase disabled:opacity-50 hover:opacity-90 transition-opacity">
              {loading ? 'Setting up profile...' : 'Submit for Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
