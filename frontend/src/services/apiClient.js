import axios from 'axios';
import { getToken } from './authService';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();

    if (contentType.includes('text/html')) {
      const error = new Error('API request returned HTML instead of JSON');
      error.response = {
        status: response.status,
        headers: response.headers,
        data: {
          error: 'The API route is misconfigured. This request is reaching the frontend instead of the backend.',
          code: 'INVALID_API_RESPONSE',
        },
      };
      error.isApiRoutingError = true;
      return Promise.reject(error);
    }

    return response;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
