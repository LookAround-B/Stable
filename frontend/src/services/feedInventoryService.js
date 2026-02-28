import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://horsestablebackend.vercel.app/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const feedInventoryService = {
  // Get all inventory records with optional filters
  getInventory: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.feedType) params.append('feedType', filters.feedType);

      const response = await axios.get(`${API_BASE_URL}/feed-inventory?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching feed inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Create a new inventory entry
  createInventory: async (data) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/feed-inventory`, data, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating feed inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Update an inventory entry
  updateInventory: async (data) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/feed-inventory`, data, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating feed inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Recalculate usage for a month
  recalculate: async (month, year) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/feed-inventory/recalculate`,
        { month, year },
        { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (error) {
      console.error('Error recalculating inventory:', error);
      throw error.response?.data || error;
    }
  },

  // Get consumption report
  getConsumptionReport: async (startDate, endDate) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/feed-inventory/consumption-report?startDate=${startDate}&endDate=${endDate}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching consumption report:', error);
      throw error.response?.data || error;
    }
  },

  // Download consumption report as CSV
  downloadConsumptionCSV: async (startDate, endDate) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/feed-inventory/consumption-report?startDate=${startDate}&endDate=${endDate}&format=csv`,
        {
          headers: getAuthHeaders(),
          responseType: 'blob',
        }
      );

      // Trigger browser download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feed-consumption-report-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error.response?.data || error;
    }
  },
};

export default feedInventoryService;
