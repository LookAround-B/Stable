import apiClient from "./apiClient";

const grassBeddingService = {
  getItems: async ({ entryType, horseId, collectedById, search } = {}) => {
    const params = new URLSearchParams();
    if (entryType) params.append("entryType", entryType);
    if (horseId) params.append("horseId", horseId);
    if (collectedById) params.append("collectedById", collectedById);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get(`/grass-bedding${query}`);
    return response.data;
  },

  createItem: async (data) => {
    const response = await apiClient.post("/grass-bedding", data);
    return response.data;
  },

  updateItem: async (id, data) => {
    const response = await apiClient.put("/grass-bedding", { id, ...data });
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await apiClient.delete("/grass-bedding", { data: { id } });
    return response.data;
  },
};

export default grassBeddingService;
