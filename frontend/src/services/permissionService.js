import apiClient from './apiClient';

export const getPermissions = () => {
  return apiClient.get('/permissions');
};

export const updatePermissions = (employeeIds, permissions) => {
  return apiClient.put('/permissions', { employeeIds, permissions });
};

// Task-level permission overrides
export const getTaskPermissions = (employeeId) => {
  return apiClient.get(`/permissions/task-permissions?employeeId=${employeeId}`);
};

export const updateTaskPermissions = (employeeId, overrides) => {
  return apiClient.put('/permissions/task-permissions', { employeeId, overrides });
};

// Role defaults matrix
export const getRoleDefaults = () => {
  return apiClient.get('/permissions/role-defaults');
};
