import apiClient from './apiClient';

export const getReports = (filters) => {
  return apiClient.get('/reports', { params: filters });
};

export const getReportById = (id) => {
  return apiClient.get(`/reports/${id}`);
};

export const createReport = (reportData) => {
  return apiClient.post('/reports', reportData);
};

export const updateReport = (id, reportData) => {
  return apiClient.put(`/reports/${id}`, reportData);
};

export const resolveReport = (id, resolution) => {
  return apiClient.post(`/reports/${id}/resolve`, { resolution });
};
