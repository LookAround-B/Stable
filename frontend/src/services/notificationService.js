import apiClient from './apiClient';

export const getNotifications = (filters) => {
  return apiClient.get('/notifications', { params: filters });
};

export const getNotificationById = (id) => {
  return apiClient.get(`/notifications/${id}`);
};

export const markAsRead = (id) => {
  return apiClient.put(`/notifications/${id}/read`);
};

export const snoozeNotification = (id, snoozeUntil) => {
  return apiClient.put(`/notifications/${id}/snooze`, { snoozeUntil });
};

export const markAllAsRead = () => {
  return apiClient.put('/notifications/mark-all-read');
};
