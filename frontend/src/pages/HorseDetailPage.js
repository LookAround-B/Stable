import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/HorseDetailPage.css';

const HorseDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Guards cannot access horse data
  if (user?.designation === 'Guard') {
    return (
      <div className="horse-detail-page">
        <div className="access-denied">
          <h2>❌ Access Denied</h2>
          <p>You do not have permission to access horse details.</p>
          <button onClick={() => navigate('/')} className="btn-back">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="horse-detail-page">
      <h1>Horse Details</h1>
      <p>Loading horse details for ID: {id}</p>
    </div>
  );
};

export default HorseDetailPage;
