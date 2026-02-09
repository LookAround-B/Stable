import apiClient from './apiClient';

export const getApprovals = (filters) => {
  return apiClient.get('/approvals', { params: filters });
};

export const getApprovalById = (id) => {
  return apiClient.get(`/approvals/${id}`);
};

export const approveTask = (id, notes) => {
  return apiClient.post(`/approvals/${id}/approve`, { notes });
};

export const rejectTask = (id, notes) => {
  return apiClient.post(`/approvals/${id}/reject`, { notes });
};

export const getApprovalChain = (taskId) => {
  return apiClient.get(`/approvals/task/${taskId}`);
};
