import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

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

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const inspectionService = {
  getAllInspections: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.round) queryParams.append('round', filters.round);
      if (filters.horseId) queryParams.append('horseId', filters.horseId);
      if (filters.severityLevel) queryParams.append('severityLevel', filters.severityLevel);
      if (filters.area) queryParams.append('area', filters.area);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.jamedarId) queryParams.append('jamedarId', filters.jamedarId);
      const response = await axios.get(`${API_BASE_URL}/inspections?${queryParams}`, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  getInspectionById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inspections/${id}`, { headers: getAuthHeaders() });
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
      const response = await axios.post(`${API_BASE_URL}/inspections`, payload, { headers: getAuthHeaders() });
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
      const response = await axios.put(`${API_BASE_URL}/inspections/${id}`, payload, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  deleteInspection: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/inspections/${id}`, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },
};

export default inspectionService;
