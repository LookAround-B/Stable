import React from 'react';
import { useI18n } from '../context/I18nContext';

const SettingsPage = () => {
  // eslint-disable-next-line no-unused-vars
  const { t } = useI18n();
  return (
    <div className="settings-page">
      <h1 style={{ marginBottom: '24px' }}>{t('Settings')}</h1>
      <div className="settings-sections">
        <div className="settings-section">
          <h2>{t('Task Configuration')}</h2>
          <p>{t('Configure task templates and schedules')}</p>
        </div>
        <div className="settings-section">
          <h2>{t('Approval Configuration')}</h2>
          <p>{t('Set SLA times and escalation rules')}</p>
        </div>
        <div className="settings-section">
          <h2>{t('Working Hours')}</h2>
          <p>{t('Configure facility hours and shifts')}</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
