import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const instructorIncentiveService = {
  // Get all incentives with optional filters
  getIncentives: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (filters.instructorId) queryParams.append('instructorId', filters.instructorId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);

      const response = await axios.get(`${API_BASE_URL}/instructor-incentives?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching incentives:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Get summary stats
  getSummary: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.year) queryParams.append('year', filters.year);

      const response = await axios.get(`${API_BASE_URL}/instructor-incentives/summary?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching incentive summary:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Create new incentive
  createIncentive: async (data) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/instructor-incentives`, data, {
        headers: getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('Error creating incentive:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Update incentive
  updateIncentive: async (id, data) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/instructor-incentives/${id}`, data, {
        headers: getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('Error updating incentive:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Delete incentive
  deleteIncentive: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/instructor-incentives/${id}`, {
        headers: getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('Error deleting incentive:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },
};

export default instructorIncentiveService;
