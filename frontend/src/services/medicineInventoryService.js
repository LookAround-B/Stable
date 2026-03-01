import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://horsestablebackend.vercel.app/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const medicineInventoryService = {
  // Get all inventory records with optional filters
  getInventory: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.medicineType) params.append('medicineType', filters.medicineType);

      const response = await axios.get(`${API_BASE_URL}/medicine-inventory?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching medicine inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Create a new inventory entry
  createInventory: async (data) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/medicine-inventory`, data, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating medicine inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Update an inventory entry
  updateInventory: async (data) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/medicine-inventory`, data, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating medicine inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Delete an inventory entry
  deleteInventory: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/medicine-inventory/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting medicine inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Bulk update inventory with consumption data
  bulkUpdateInventory: async (data) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/medicine-inventory/bulk-update`, data, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating medicine inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Generate report for a date range
  getReport: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/medicine-inventory/report`, {
        params: { startDate, endDate },
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching medicine inventory report:', error);
      throw error.response?.data || error;
    }
  },

  // Download CSV report
  downloadReport: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/medicine-inventory/report/csv`, {
        params: { startDate, endDate },
        headers: getAuthHeaders(),
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading medicine inventory report:', error);
      throw error.response?.data || error;
    }
  },
};

export default medicineInventoryService;
