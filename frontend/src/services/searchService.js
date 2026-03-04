import apiClient from './apiClient';

const searchService = {
  // Universal search across horses, employees, and other entities
  searchAll: async (query) => {
    if (!query || query.trim().length < 1) {
      return { horses: [], employees: [], tasks: [], medicines: [] };
    }

    try {
      const results = await Promise.all([
        // Search horses by name
        apiClient.get(`/horses?search=${encodeURIComponent(query)}`).catch(() => ({ data: { data: [] } })),
        // Search employees by name
        apiClient.get(`/employees?search=${encodeURIComponent(query)}`).catch(() => ({ data: { data: [] } })),
        // Search tasks by title
        apiClient.get(`/tasks?search=${encodeURIComponent(query)}`).catch(() => ({ data: { data: [] } })),
      ]);

      return {
        horses: (results[0]?.data?.data || results[0]?.data || []).slice(0, 5),
        employees: (results[1]?.data?.data || results[1]?.data || []).slice(0, 5),
        tasks: (results[2]?.data?.data || results[2]?.data || []).slice(0, 5),
      };
    } catch (error) {
      console.error('Search error:', error);
      return { horses: [], employees: [], tasks: [] };
    }
  },

  searchHorses: async (query) => {
    try {
      const response = await apiClient.get(`/horses?search=${encodeURIComponent(query)}`);
      return response.data || [];
    } catch (error) {
      console.error('Horse search error:', error);
      return [];
    }
  },

  searchEmployees: async (query) => {
    try {
      const response = await apiClient.get(`/employees?search=${encodeURIComponent(query)}`);
      return response.data || [];
    } catch (error) {
      console.error('Employee search error:', error);
      return [];
    }
  },

  searchTasks: async (query) => {
    try {
      const response = await apiClient.get(`/tasks?search=${encodeURIComponent(query)}`);
      return response.data || [];
    } catch (error) {
      console.error('Task search error:', error);
      return [];
    }
  },
};

export default searchService;
