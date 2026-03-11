import React from 'react';
import { useI18n } from '../context/I18nContext';

const SettingsPage = () => {
  const { t } = useI18n();
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>{t('Settings')}</h1>
        <p>{t('Manage application configuration')}</p>
      </div>
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
