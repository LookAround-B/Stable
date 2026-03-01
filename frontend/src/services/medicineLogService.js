import apiClient from './apiClient';

const medicineLogService = {
  // Get all medicine logs with optional filters
  getMedicineLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('approvalStatus', filters.status);
      if (filters.horseId) params.append('horseId', filters.horseId);
      if (filters.jamedarId) params.append('jamedarId', filters.jamedarId);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      const response = await apiClient.get(`/medicine-logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching medicine logs:', error);
      throw error.response?.data || error;
    }
  },

  // Get a single medicine log
  getMedicineLogById: async (id) => {
    try {
      const response = await apiClient.get(`/medicine-logs/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching medicine log:', error);
      throw error.response?.data || error;
    }
  },

  // Create a new medicine log entry (Jamedar)
  createMedicineLog: async (data) => {
    try {
      const response = await apiClient.post('/medicine-logs', data);
      return response.data;
    } catch (error) {
      console.error('Error creating medicine log:', error);
      throw error.response?.data || error;
    }
  },

  // Update a medicine log (only if not approved)
  updateMedicineLog: async (id, data) => {
    try {
      const response = await apiClient.put(`/medicine-logs/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating medicine log:', error);
      throw error.response?.data || error;
    }
  },

  // Delete a medicine log (only if not approved)
  deleteMedicineLog: async (id) => {
    try {
      const response = await apiClient.delete(`/medicine-logs/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting medicine log:', error);
      throw error.response?.data || error;
    }
  },

  // Approve a medicine log (Stable Manager only)
  approveMedicineLog: async (id, comments = '') => {
    try {
      const response = await apiClient.post(`/medicine-logs/${id}/approve`, {
        comments,
      });
      return response.data;
    } catch (error) {
      console.error('Error approving medicine log:', error);
      throw error.response?.data || error;
    }
  },

  // Reject a medicine log (Stable Manager only)
  rejectMedicineLog: async (id, rejectionReason) => {
    try {
      const response = await apiClient.post(`/medicine-logs/${id}/reject`, {
        rejectionReason,
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting medicine log:', error);
      throw error.response?.data || error;
    }
  },

  // Get pending medicine logs for approval (Stable Manager only)
  getPendingMedicineLogs: async () => {
    try {
      const response = await apiClient.get('/medicine-logs/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending medicine logs:', error);
      throw error.response?.data || error;
    }
  },

  // Get medicine logs created by current user (Jamedar)
  getMyMedicineLogs: async () => {
    try {
      const response = await apiClient.get('/medicine-logs/my-logs');
      return response.data;
    } catch (error) {
      console.error('Error fetching my medicine logs:', error);
      throw error.response?.data || error;
    }
  },
};

export default medicineLogService;
