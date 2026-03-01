import apiClient from "./apiClient";

const groceriesInventoryService = {
  // Get all groceries
  getGroceries: async () => {
    const response = await apiClient.get("/groceries-inventory");
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

  // Delete grocery entry
  deleteGrocery: async (id) => {
    const response = await apiClient.delete("/groceries-inventory", { data: { id } });
    return response.data;
  },
};

export default groceriesInventoryService;
