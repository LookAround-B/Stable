import apiClient from "./apiClient";

const groceriesInventoryService = {
  // Get groceries with optional filters
  getGroceries: async ({ month, year, search } = {}) => {
    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (year) params.append("year", year);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/groceries-inventory${query}`);
    return response.data;
  },

  // Get distinct item name+unit suggestions (all-time, for dropdown)
  getItemSuggestions: async () => {
    const response = await apiClient.get("/groceries-inventory?suggestions=true");
    return response.data;
  },

  // Create new grocery entry
  createGrocery: async (data) => {
    const response = await apiClient.post("/groceries-inventory", data);
    return response.data;
  },

  // Update grocery entry
  updateGrocery: async (id, data) => {
    const response = await apiClient.put("/groceries-inventory", { id, ...data });
    return response.data;
  },

  // Set threshold for a grocery item (admin only)
  setThreshold: async (id, threshold, notifyAdmin) => {
    const response = await apiClient.patch('/groceries-inventory', { id, threshold, notifyAdmin });
    return response.data;
  },

  // Delete grocery entry
  deleteGrocery: async (id) => {
    const response = await apiClient.delete("/groceries-inventory", { data: { id } });
    return response.data;
  },
};

export default groceriesInventoryService;
