import apiClient from './apiClient';

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
