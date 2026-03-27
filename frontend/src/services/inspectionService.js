import apiClient from './apiClient';

// Convert a File or data-URL to a base64 data URL string
const toBase64 = (img) => {
  if (img instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(img);
    });
  }
  return Promise.resolve(img);
};

const inspectionService = {
  getAllInspections: async (filters = {}) => {
    try {
      const response = await apiClient.get('/inspections', { params: filters });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  getInspectionById: async (id) => {
    try {
      const response = await apiClient.get(`/inspections/${id}`);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  createInspection: async (formData) => {
    try {
      const imageDataArray = await Promise.all((formData.images || []).map(toBase64));
      const payload = {
        round: formData.round,
        description: formData.description,
        horseId: formData.horseId || null,
        location: formData.location,
        area: formData.area || null,
        severityLevel: formData.severityLevel,
        images: imageDataArray,
      };
      const response = await apiClient.post('/inspections', payload);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  updateInspection: async (id, formData) => {
    try {
      const payload = {
        ...(formData.round && { round: formData.round }),
        ...(formData.description && { description: formData.description }),
        ...(formData.horseId !== undefined && { horseId: formData.horseId || null }),
        ...(formData.location && { location: formData.location }),
        ...(formData.area !== undefined && { area: formData.area || null }),
        ...(formData.severityLevel && { severityLevel: formData.severityLevel }),
        ...(formData.status && { status: formData.status }),
        ...(formData.comments !== undefined && { comments: formData.comments || null }),
        ...(formData.resolutionNotes !== undefined && { resolutionNotes: formData.resolutionNotes || null }),
      };
      if (formData.images && Array.isArray(formData.images)) {
        payload.images = await Promise.all(formData.images.map(toBase64));
      }
      const response = await apiClient.put(`/inspections/${id}`, payload);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  deleteInspection: async (id) => {
    try {
      const response = await apiClient.delete(`/inspections/${id}`);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },
};

export default inspectionService;
