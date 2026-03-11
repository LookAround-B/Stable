import React from 'react';
import { useI18n } from '../context/I18nContext';

const ReportsPage = () => {
  const { t } = useI18n();
  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>{t('Reports')}</h1>
        <p>{t('View and generate system reports')}</p>
      </div>
      <div className="reports-grid">
        <div className="report-card">
          <h3>{t('Attendance Reports')}</h3>
          <p>{t('View daily and team attendance summaries.')}</p>
        </div>
        <div className="report-card">
          <h3>{t('Task Reports')}</h3>
          <p>{t('View task completion and assignment statistics.')}</p>
        </div>
        <div className="report-card">
          <h3>{t('Expense Reports')}</h3>
          <p>{t('View expense summaries and breakdowns.')}</p>
        </div>
        <div className="report-card">
          <h3>{t('Horse Health Reports')}</h3>
          <p>{t('View inspection rounds and medicine logs.')}</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
