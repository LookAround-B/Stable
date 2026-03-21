import apiClient from "./apiClient";

const housekeepingInventoryService = {
  getItems: async ({ category, usageArea, search } = {}) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (usageArea) params.append("usageArea", usageArea);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/housekeeping-inventory${query}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await apiClient.post("/housekeeping-inventory", data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await apiClient.put("/housekeeping-inventory", { id, ...data });
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await apiClient.delete("/housekeeping-inventory", { data: { id } });
    return response.data;
  },
};

export default housekeepingInventoryService;
