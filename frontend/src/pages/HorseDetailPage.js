import React from 'react';
import { useParams } from 'react-router-dom';
import '../styles/HorseDetailPage.css';

const HorseDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="horse-detail-page">
      <h1>Horse Details</h1>
      <p>Loading horse details for ID: {id}</p>
    </div>
  );
};

export default HorseDetailPage;
