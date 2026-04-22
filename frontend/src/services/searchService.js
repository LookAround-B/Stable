import apiClient from './apiClient';

const searchService = {
  // Universal search across all entities
  searchAll: async (query) => {
    if (!query || query.trim().length < 1) {
      return {
        horses: [],
        employees: [],
        tasks: [],
        meetings: [],
        medicineLogs: [],
        medicineInventory: [],
        feedInventory: [],
        horseFeeds: [],
        tackInventory: [],
        farrierShoeing: [],
        farrierInventory: [],
        grassBedding: [],
        housekeepingInventory: [],
        groceriesInventory: [],
        inspections: [],
        expenses: [],
        fines: [],
        gateEntries: [],
        healthRecords: [],
      };
    }

    try {
      const searchParam = `search=${encodeURIComponent(query)}`;

      const results = await Promise.all([
        // Core entities
        apiClient.get(`/horses?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/employees?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/tasks?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/meetings?${searchParam}`).catch(() => ({ data: { data: [] } })),
        // Stable Operations
        apiClient.get(`/medicine-logs?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/medicine-inventory?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/feed-inventory?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/horse-feeds?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/tack-inventory?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/farrier-shoeing?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/farrier-inventory?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/grass-bedding?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/housekeeping-inventory?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/groceries-inventory?${searchParam}`).catch(() => ({ data: { data: [] } })),
        // Ground Operations
        apiClient.get(`/inspections?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/gate-entry/register?${searchParam}`).catch(() => ({ data: { data: [] } })),
        // Finance
        apiClient.get(`/expenses?${searchParam}`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/fines?${searchParam}`).catch(() => ({ data: { data: [] } })),
        // Health
        apiClient.get(`/health-records?${searchParam}`).catch(() => ({ data: { data: [] } })),
      ]);

      const extractData = (res) => {
        const d = res?.data?.data || res?.data || [];
        return Array.isArray(d) ? d.slice(0, 5) : [];
      };

      return {
        horses: extractData(results[0]),
        employees: extractData(results[1]),
        tasks: extractData(results[2]),
        meetings: extractData(results[3]),
        medicineLogs: extractData(results[4]),
        medicineInventory: extractData(results[5]),
        feedInventory: extractData(results[6]),
        horseFeeds: extractData(results[7]),
        tackInventory: extractData(results[8]),
        farrierShoeing: extractData(results[9]),
        farrierInventory: extractData(results[10]),
        grassBedding: extractData(results[11]),
        housekeepingInventory: extractData(results[12]),
        groceriesInventory: extractData(results[13]),
        inspections: extractData(results[14]),
        gateEntries: extractData(results[15]),
        expenses: extractData(results[16]),
        fines: extractData(results[17]),
        healthRecords: extractData(results[18]),
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        horses: [],
        employees: [],
        tasks: [],
        meetings: [],
        medicineLogs: [],
        medicineInventory: [],
        feedInventory: [],
        horseFeeds: [],
        tackInventory: [],
        farrierShoeing: [],
        farrierInventory: [],
        grassBedding: [],
        housekeepingInventory: [],
        groceriesInventory: [],
        inspections: [],
        expenses: [],
        fines: [],
        gateEntries: [],
        healthRecords: [],
      };
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
