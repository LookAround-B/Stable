import apiClient from './apiClient';

export const getHorses = (filters) => {
  return apiClient.get('/horses', { params: filters });
};

export const getHorseById = (id) => {
  return apiClient.get(`/horses/${id}`);
};

export const createHorse = (horseData) => {
  return apiClient.post('/horses', horseData);
};

export const updateHorse = (id, horseData) => {
  return apiClient.put(`/horses/${id}`, horseData);
};

export const deleteHorse = (id) => {
  return apiClient.delete(`/horses/${id}`);
};

export const getHorseHealthRecords = (horseId) => {
  return apiClient.get(`/horses/${horseId}/health-records`);
};

export const getHorseTasks = (horseId) => {
  return apiClient.get(`/horses/${horseId}/tasks`);
};
