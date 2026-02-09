import apiClient from './apiClient';

export const getTasks = (filters) => {
  return apiClient.get('/tasks', { params: filters });
};

export const getTaskById = (id) => {
  return apiClient.get(`/tasks/${id}`);
};

export const createTask = (taskData) => {
  return apiClient.post('/tasks', taskData);
};

export const updateTask = (id, taskData) => {
  return apiClient.put(`/tasks/${id}`, taskData);
};

export const startTask = (id) => {
  return apiClient.post(`/tasks/${id}/start`);
};

export const completeTask = (id) => {
  return apiClient.post(`/tasks/${id}/complete`);
};

export const uploadProof = (id, formData) => {
  return apiClient.post(`/tasks/${id}/upload-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const submitQuestionnaire = (id, questionnaireData) => {
  return apiClient.post(`/tasks/${id}/submit-questionnaire`, questionnaireData);
};
