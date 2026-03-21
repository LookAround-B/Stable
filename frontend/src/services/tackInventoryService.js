import apiClient from "./apiClient";

const tackInventoryService = {
  getItems: async ({ category, condition, horseId, search } = {}) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (condition) params.append("condition", condition);
    if (horseId) params.append("horseId", horseId);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/tack-inventory${query}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await apiClient.post("/tack-inventory", data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await apiClient.put("/tack-inventory", { id, ...data });
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await apiClient.delete("/tack-inventory", { data: { id } });
    return response.data;
  },
};

export default tackInventoryService;
