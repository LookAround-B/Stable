import apiClient from './apiClient';

export const getEmployees = (filters) => {
  return apiClient.get('/employees', { params: filters });
};

export const getEmployeeById = (id) => {
  return apiClient.get(`/employees/${id}`);
};

export const createEmployee = (employeeData) => {
  return apiClient.post('/employees', employeeData);
};

export const updateEmployee = (id, employeeData) => {
  return apiClient.put(`/employees/${id}`, employeeData);
};

export const approveEmployee = (id) => {
  return apiClient.post(`/employees/${id}/approve`);
};

export const getEmployeePerformance = (id) => {
  return apiClient.get(`/employees/${id}/performance`);
};

export const deleteEmployee = (id) => {
  return apiClient.delete(`/employees/${id}`);
};
