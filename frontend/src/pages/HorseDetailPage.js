import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const HorseDetailPage = () => {
  const { id } = useParams();
  const { t } = useI18n();
  const p = usePermissions();

  if (!p.viewHorses) return <Navigate to="/dashboard" replace />;

  return (
    <div className="horse-detail-page">
      <h1>{t('Horse Details')}</h1>
      <p>Loading horse details for ID: {id}</p>
    </div>
  );
};

export default HorseDetailPage;
