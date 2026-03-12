import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Apply saved text-size preference on boot (before first paint)
(() => {
  try {
    const size = localStorage.getItem('efm-text-size');
    if (size && ['small', 'medium', 'large'].includes(size)) {
      document.documentElement.setAttribute('data-text-size', size);
    } else {
      document.documentElement.setAttribute('data-text-size', 'medium');
    }
  } catch { /* ignore */ }
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
