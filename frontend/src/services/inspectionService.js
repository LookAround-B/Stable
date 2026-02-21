import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://horsestablebackend.vercel.app/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const inspectionService = {
  // Get all inspections with optional filters
  getAllInspections: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.round) queryParams.append('round', filters.round);
      if (filters.horseId) queryParams.append('horseId', filters.horseId);
      if (filters.severityLevel) queryParams.append('severityLevel', filters.severityLevel);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.jamedarId) queryParams.append('jamedarId', filters.jamedarId);

      const response = await axios.get(`${API_BASE_URL}/inspections?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      console.log('📋 Inspections data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching inspections:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Get inspection by ID
  getInspectionById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inspections/${id}`, {
        headers: getAuthHeaders(),
      });
      console.log('📋 Inspection data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching inspection:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Create new inspection with image
  createInspection: async (formData) => {
    try {
      console.log('📤 Creating inspection with data:', {
        round: formData.round,
        horseId: formData.horseId,
        location: formData.location,
        severityLevel: formData.severityLevel,
        descriptionLength: formData.description?.length,
        imageType: typeof formData.image,
      });

      // Convert image File to base64 if needed
      let imageData = formData.image;
      if (formData.image instanceof File) {
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log('🔄 Converted image to base64');
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(formData.image);
        });
      }

      const payload = {
        round: formData.round,
        description: formData.description,
        horseId: formData.horseId || null,
        location: formData.location,
        severityLevel: formData.severityLevel,
        image: imageData,
      };

      const response = await axios.post(`${API_BASE_URL}/inspections`, payload, {
        headers: getAuthHeaders(),
      });

      console.log('✅ Inspection created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating inspection:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Update inspection
  updateInspection: async (id, formData) => {
    try {
      console.log('📝 Updating inspection:', id);
      console.log('📝 Form data:', formData);

      const payload = {
        ...(formData.round && { round: formData.round }),
        ...(formData.description && { description: formData.description }),
        ...(formData.horseId !== undefined && { horseId: formData.horseId || null }),
        ...(formData.location && { location: formData.location }),
        ...(formData.severityLevel && { severityLevel: formData.severityLevel }),
        ...(formData.status && { status: formData.status }),
        ...(formData.comments !== undefined && { comments: formData.comments || null }),
        ...(formData.resolutionNotes !== undefined && { resolutionNotes: formData.resolutionNotes || null }),
      };

      // Handle image if it's a new file
      if (formData.image && formData.image instanceof File) {
        payload.image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log('🔄 Converted image to base64');
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(formData.image);
        });
      } else if (formData.image && typeof formData.image === 'string' && formData.image.startsWith('data:')) {
        payload.image = formData.image;
      }

      console.log('📤 Sending payload:', payload);

      const response = await axios.put(`${API_BASE_URL}/inspections/${id}`, payload, {
        headers: getAuthHeaders(),
      });

      console.log('✅ Inspection updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating inspection:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Delete inspection
  deleteInspection: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/inspections/${id}`, {
        headers: getAuthHeaders(),
      });

      console.log('✅ Inspection deleted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting inspection:', error);
      const err = new Error(error.response?.data?.error || error.message);
      err.status = error.response?.status;
      throw err;
    }
  },
};

export default inspectionService;
