import apiClient from './apiClient';
import { getToken } from './authService';

export const getNotifications = (filters) => {
  return apiClient.get('/notifications', { params: filters });
};

export const getUnreadCount = () => {
  return apiClient.get('/notifications/unread-count');
};

export const getNotificationById = (id) => {
  return apiClient.get(`/notifications/${id}`);
};

export const markAsRead = (id) => {
  return apiClient.put(`/notifications/${id}/read`);
};

export const markAllAsRead = () => {
  return apiClient.put('/notifications/mark-all-read');
};

const getNotificationStreamUrl = () => {
  const baseUrl = (apiClient.defaults.baseURL || process.env.REACT_APP_API_URL || '/api').replace(/\/$/, '');
  const token = getToken();
  return `${baseUrl}/notifications/stream?token=${encodeURIComponent(token || '')}`;
};

export const subscribeToNotifications = ({ onState, onError }) => {
  if (typeof window === 'undefined') return null;

  const token = getToken();
  if (!token) return null;

  const eventSource = new EventSource(getNotificationStreamUrl());

  eventSource.addEventListener('notifications', (event) => {
    try {
      const payload = JSON.parse(event.data);
      onState?.(payload);
    } catch (error) {
      onError?.(error);
    }
  });

  eventSource.onerror = (error) => {
    onError?.(error);
  };

  return eventSource;
};
