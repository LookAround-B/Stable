import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

const DEFAULT_SETTINGS = [
  { key: 'stable_name', value: 'Horse Stable', description: 'Name of the stable facility', label: 'Stable Name', type: 'text' },
  { key: 'working_hours_start', value: '06:00', description: 'Daily working hours start time', label: 'Working Hours Start', type: 'time' },
  { key: 'working_hours_end', value: '18:00', description: 'Daily working hours end time', label: 'Working Hours End', type: 'time' },
  { key: 'attendance_cutoff_time', value: '09:00', description: 'Cut-off time for marking attendance', label: 'Attendance Cut-off Time', type: 'time' },
  { key: 'max_leave_days_per_month', value: '2', description: 'Maximum leave days allowed per month', label: 'Max Leave Days/Month', type: 'number' },
  { key: 'task_auto_escalation_hours', value: '24', description: 'Hours before unfinished task escalates', label: 'Task Escalation (hrs)', type: 'number' },
  { key: 'inspection_rounds_per_day', value: '3', description: 'Required inspection rounds per day', label: 'Inspections Per Day', type: 'number' },
  { key: 'expense_approval_threshold', value: '5000', description: 'Amount above which expense needs approval (₹)', label: 'Expense Approval Threshold (₹)', type: 'number' },
  { key: 'notification_email', value: '', description: 'Email for system notifications', label: 'Notification Email', type: 'email' },
  { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', label: 'Maintenance Mode', type: 'toggle' },
];

const SettingsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const isAdmin = user?.designation === 'Super Admin' || user?.designation === 'Director' || user?.designation === 'School Administrator';

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/settings');
      const data = response.data?.data || response.data || [];
      const settingsMap = {};
      if (Array.isArray(data)) {
        data.forEach(s => { settingsMap[s.key] = s.value; });
      }
      // Merge with defaults
      const merged = {};
      DEFAULT_SETTINGS.forEach(def => {
        merged[def.key] = settingsMap[def.key] !== undefined ? settingsMap[def.key] : def.value;
      });
      setSettings(merged);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use defaults
      const defaults = {};
      DEFAULT_SETTINGS.forEach(def => { defaults[def.key] = def.value; });
      setSettings(defaults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    if (!isAdmin) {
      setMessage(t('Only administrators can modify settings'));
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSaving(key);
    try {
      const def = DEFAULT_SETTINGS.find(d => d.key === key);
      await apiClient.put('/settings', {
        key,
        value: settings[key],
        description: def?.description || '',
      });
      setMessage(`${t('Setting saved')}: ${def?.label || key}`);
      setMessageType('success');
    } catch (error) {
      console.error('Error saving setting:', error);
      setMessage(`${t('Error saving setting')}: ${error.response?.data?.error || error.message}`);
      setMessageType('error');
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSaveAll = async () => {
    if (!isAdmin) {
      setMessage(t('Only administrators can modify settings'));
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSaving('all');
    try {
      for (const def of DEFAULT_SETTINGS) {
        await apiClient.put('/settings', {
          key: def.key,
          value: settings[def.key],
          description: def.description,
        });
      }
      setMessage(t('All settings saved successfully'));
      setMessageType('success');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(`${t('Error saving settings')}: ${error.response?.data?.error || error.message}`);
      setMessageType('error');
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const sectionStyle = {
    background: 'var(--bg-primary)',
    borderRadius: '10px',
    border: '1px solid var(--border-primary)',
    padding: '20px',
    marginBottom: '16px',
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-primary)',
    fontSize: '0.875rem',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    width: '100%',
    maxWidth: '300px',
  };

  const saveBtnStyle = {
    padding: '6px 16px',
    borderRadius: '6px',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#fff',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 500,
    opacity: saving ? 0.7 : 1,
  };

  // Group settings
  const groups = [
    {
      title: t('General'),
      description: t('Basic facility settings'),
      keys: ['stable_name', 'notification_email', 'maintenance_mode'],
    },
    {
      title: t('Working Hours & Attendance'),
      description: t('Configure work schedules and attendance rules'),
      keys: ['working_hours_start', 'working_hours_end', 'attendance_cutoff_time', 'max_leave_days_per_month'],
    },
    {
      title: t('Tasks & Inspections'),
      description: t('Configure task escalation and inspection requirements'),
      keys: ['task_auto_escalation_hours', 'inspection_rounds_per_day'],
    },
    {
      title: t('Finance'),
      description: t('Expense and billing thresholds'),
      keys: ['expense_approval_threshold'],
    },
  ];

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="page-header">
          <div><h1>{t('Settings')}</h1><p>{t('Manage application configuration')}</p></div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>{t('Settings')}</h1>
          <p>{t('Manage application configuration')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleSaveAll}
            disabled={saving === 'all'}
            style={{ ...saveBtnStyle, padding: '8px 24px', fontSize: '0.875rem' }}
          >
            {saving === 'all' ? t('Saving...') : t('Save All Settings')}
          </button>
        )}
      </div>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem',
          backgroundColor: messageType === 'error' ? '#fef2f2' : '#f0fdf4',
          color: messageType === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${messageType === 'error' ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {message}
        </div>
      )}

      {!isAdmin && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem',
          backgroundColor: '#fefce8', color: '#a16207', border: '1px solid #fde68a',
        }}>
          {t('You have read-only access. Only administrators can modify settings.')}
        </div>
      )}

      {groups.map((group, gi) => (
        <div key={gi} style={sectionStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>{group.title}</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{group.description}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {group.keys.map(key => {
              const def = DEFAULT_SETTINGS.find(d => d.key === key);
              if (!def) return null;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{t(def.label)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t(def.description)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {def.type === 'toggle' ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                        <div
                          onClick={() => isAdmin && handleChange(key, settings[key] === 'true' ? 'false' : 'true')}
                          style={{
                            width: '44px', height: '24px', borderRadius: '12px', position: 'relative',
                            backgroundColor: settings[key] === 'true' ? 'var(--accent-primary)' : '#d1d5db',
                            transition: 'background-color 0.2s', cursor: isAdmin ? 'pointer' : 'not-allowed',
                          }}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
                            position: 'absolute', top: '2px', transition: 'left 0.2s',
                            left: settings[key] === 'true' ? '22px' : '2px',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.85rem' }}>{settings[key] === 'true' ? t('Enabled') : t('Disabled')}</span>
                      </label>
                    ) : (
                      <input
                        type={def.type}
                        value={settings[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        disabled={!isAdmin}
                        style={{ ...inputStyle, opacity: isAdmin ? 1 : 0.6 }}
                      />
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving === key}
                        style={{ ...saveBtnStyle, whiteSpace: 'nowrap' }}
                      >
                        {saving === key ? '...' : t('Save')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SettingsPage;
