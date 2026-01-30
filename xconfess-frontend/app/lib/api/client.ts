import axios, { AxiosError, AxiosResponse } from 'axios';
import { logError, getErrorMessage } from '@/app/lib/utils/errorHandler';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logError(error, 'API Request Interceptor');
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retries
let retryCount = 0;
const MAX_RETRIES = 3;

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      logError(error, 'API Client - Unauthorized', {
        url: config?.url,
      });
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      logError(error, 'API Client - Forbidden', {
        url: config?.url,
      });
      return Promise.reject(error);
    }

    // Handle 429 Too Many Requests with exponential backoff
    if (error.response?.status === 429) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
        
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return apiClient(config!);
      }
      logError(error, 'API Client - Too Many Requests (max retries exceeded)', {
        url: config?.url,
        retries: retryCount,
      });
      return Promise.reject(error);
    }

    // Handle network errors with retry
    if (!error.response) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delayMs = Math.pow(2, retryCount) * 1000;
        
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return apiClient(config!);
      }
      logError(error, 'API Client - Network Error (max retries exceeded)', {
        url: config?.url,
        message: error.message,
      });
      return Promise.reject(error);
    }

    // Handle 5xx Server Errors with retry
    if (error.response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delayMs = Math.pow(2, retryCount) * 1000;
        
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return apiClient(config!);
      }
      logError(error, 'API Client - Server Error (max retries exceeded)', {
        url: config?.url,
        status: error.response.status,
      });
      return Promise.reject(error);
    }

    // Log other errors
    logError(error, 'API Client - Request Failed', {
      url: config?.url,
      status: error.response?.status,
      message: getErrorMessage(error),
    });

    // Reset retry count on successful response or non-retryable error
    retryCount = 0;
    return Promise.reject(error);
  }
);

export default apiClient;
export { AxiosError };
