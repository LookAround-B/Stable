import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const expenseService = {
  // Get all expenses with filters
  getAllExpenses: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.type) params.append('type', filters.type);
      if (filters.horseId) params.append('horseId', filters.horseId);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const url = `${API_BASE_URL}/expenses?${params.toString()}`;
      console.log('🔍 Fetching expenses from:', url);
      console.log('📋 Filters:', filters);
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      console.log('✅ Expenses API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
      throw error.response?.data || { error: error.message };
    }
  },

  // Get single expense
  getExpenseById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expenses/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Create new expense
  createExpense: async (expenseData) => {
    try {
      const formDataToSend = {
        type: expenseData.type,
        amount: expenseData.amount,
        description: expenseData.description,
        date: expenseData.date,
        horseId: expenseData.horseId || null,
        employeeId: expenseData.employeeId || null,
        attachments: [], // Will be populated if there are files
      };

      // Convert file attachments to base64
      const filePromises = (expenseData.attachments || [])
        .filter(f => f instanceof File)
        .map(file => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: e.target.result, // base64 string
            });
          };
          reader.readAsDataURL(file);
        }));

      if (filePromises.length > 0) {
        formDataToSend.attachments = await Promise.all(filePromises);
        console.log(`📎 Converted ${formDataToSend.attachments.length} files to base64`);
      }

      const response = await axios.post(`${API_BASE_URL}/expenses`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Update expense
  updateExpense: async (id, expenseData) => {
    try {
      const formDataToSend = {
        type: expenseData.type,
        amount: expenseData.amount,
        description: expenseData.description,
        date: expenseData.date,
        horseId: expenseData.horseId || null,
        employeeId: expenseData.employeeId || null,
        attachments: [], // Will be populated with existing and new files
      };

      // Separate existing URLs from new files
      const existingUrls = (expenseData.attachments || []).filter(f => typeof f === 'string');
      const newFiles = (expenseData.attachments || []).filter(f => f instanceof File);

      // Add existing URLs to attachments
      formDataToSend.attachments = existingUrls;

      // Convert new file attachments to base64
      if (newFiles.length > 0) {
        const filePromises = newFiles.map(file => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: e.target.result, // base64 string
            });
          };
          reader.readAsDataURL(file);
        }));

        const convertedFiles = await Promise.all(filePromises);
        formDataToSend.attachments = [...existingUrls, ...convertedFiles];
        console.log(`📎 Converted ${convertedFiles.length} new files to base64`);
      }

      const response = await axios.put(`${API_BASE_URL}/expenses/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Delete expense
  deleteExpense: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/expenses/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },

  // Upload attachment
  uploadAttachment: async (file) => {
    try {
      // Check file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/expenses/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { error: error.message };
    }
  },
};

export default expenseService;
