import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://horsestablebackend.vercel.app/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const fineService = {
  // Get all fines with optional filters
  getAllFines: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (filters.status) queryParams.append('status', filters.status);
      if (filters.issuedToId) queryParams.append('issuedToId', filters.issuedToId);
      if (filters.issuedById) queryParams.append('issuedById', filters.issuedById);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await axios.get(`${API_BASE_URL}/fines?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      console.log('📋 Fines data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching fines:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Get fine by ID
  getFineById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fines/${id}`, {
        headers: getAuthHeaders(),
      });
      console.log('📋 Fine data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching fine:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Create new fine with evidence image
  issueFine: async (formData) => {
    try {
      console.log('📤 Creating fine with data:', {
        issuedToId: formData.issuedToId,
        reasonLength: formData.reason?.length,
        imageType: typeof formData.evidenceImage,
      });

      // Convert image File to base64 if needed
      let imageData = formData.evidenceImage;
      if (formData.evidenceImage instanceof File) {
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log('🔄 Converted image to base64');
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(formData.evidenceImage);
        });
      }

      const payload = {
        issuedToId: formData.issuedToId,
        reason: formData.reason,
        evidenceImage: imageData,
      };

      const response = await axios.post(`${API_BASE_URL}/fines`, payload, {
        headers: getAuthHeaders(),
      });

      console.log('✅ Fine created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating fine:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Update fine status
  updateFineStatus: async (id, status, resolutionNotes) => {
    try {
      console.log('📝 Updating fine status:', { id, status, notesLength: resolutionNotes?.length });

      const payload = {
        status,
        resolutionNotes: resolutionNotes || '',
      };

      const response = await axios.put(`${API_BASE_URL}/fines/${id}`, payload, {
        headers: getAuthHeaders(),
      });

      console.log('✅ Fine updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating fine:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Delete fine
  deleteFine: async (id) => {
    try {
      console.log('🗑️ Deleting fine:', id);

      const response = await axios.delete(`${API_BASE_URL}/fines/${id}`, {
        headers: getAuthHeaders(),
      });

      console.log('✅ Fine deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting fine:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },
};

export default fineService;
