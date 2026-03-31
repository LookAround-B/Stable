import React from 'react';
import { useI18n } from '../context/I18nContext';

const NotFoundPage = () => {
  const { t } = useI18n();
  return (
    <div className="not-found-page">
      <h1>404 - Page Not Found</h1>
      <p>{t("The page you are looking for does not exist.")}</p>
    </div>
  );
};

export default NotFoundPage;
