import apiClient from './apiClient';

export const getPermissions = () => {
  return apiClient.get('/permissions');
};

export const updatePermissions = (employeeIds, permissions) => {
  return apiClient.put('/permissions', { employeeIds, permissions });
};
