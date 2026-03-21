import apiClient from "./apiClient";

const farrierInventoryService = {
  getItems: async ({ category, horseId, search } = {}) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (horseId) params.append("horseId", horseId);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/farrier-inventory${query}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await apiClient.post("/farrier-inventory", data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await apiClient.put("/farrier-inventory", { id, ...data });
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await apiClient.delete("/farrier-inventory", { data: { id } });
    return response.data;
  },
};

export default farrierInventoryService;
