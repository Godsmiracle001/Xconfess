import axios, { AxiosError, AxiosResponse } from "axios";
import { logError } from "@/app/lib/utils/errorHandler";
import { useAuthStore } from "@/app/lib/store/authStore";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

/**
 * Extend Axios config
 */
declare module "axios" {
  interface InternalAxiosRequestConfig {
    __retryCount?: number;
    correlationId?: string;
    _retry?: boolean; // for refresh logic
  }
}

const MAX_RETRIES = 3;

/**
 * Request interceptor
 */
apiClient.interceptors.request.use(
  (config) => {
    config.withCredentials = true;

    // Correlation ID (main)
    const correlationId = crypto.randomUUID();
    config.headers["X-Correlation-ID"] = correlationId;
    config.correlationId = correlationId;

    return config;
  },
  (error) => {
    logError(error, "API Request Interceptor");
    return Promise.reject(error);
  }
);

/**
 * Response interceptor (MERGED)
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config;

    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount ?? 0;

    /**
     * 1️⃣ Handle 401 with refresh (your logic)
     */
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;

      try {
        await apiClient.post("/auth/refresh");
        return apiClient(config); // retry original request
      } catch (refreshError) {
        // Refresh failed → clear auth (main + your logic)
        useAuthStore.getState().clearAuth();

        logError(refreshError, "API Client - Refresh Failed", {
          url: config.url,
        });

        return Promise.reject(refreshError);
      }
    }

    /**
     * 2️⃣ Handle 403
     */
    if (error.response?.status === 403) {
      logError(error, "API Client - Forbidden", { url: config.url });
      return Promise.reject(error);
    }

    /**
     * 3️⃣ Retry logic (main)
     */
    const isRetryable =
      error.response?.status === 429 ||
      (error.response?.status !== undefined &&
        error.response.status >= 500) ||
      !error.response;

    if (isRetryable && config.__retryCount < MAX_RETRIES) {
      config.__retryCount++;
      const delayMs = Math.pow(2, config.__retryCount) * 1000;

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return apiClient(config);
    }

    /**
     * 4️⃣ Final error handling
     */
    const context = !error.response
      ? "API Client - Network Error"
      : error.response.status === 429
      ? "API Client - Too Many Requests"
      : error.response.status >= 500
      ? "API Client - Server Error"
      : "API Client - Request Failed";

    logError(
      error,
      config.__retryCount > 0
        ? `${context} (after ${config.__retryCount} retries)`
        : context,
      {
        url: config.url,
        status: error.response?.status,
        retries: config.__retryCount,
        correlationId: config.correlationId,
      }
    );

    return Promise.reject(error);
  }
);

export default apiClient;
export { AxiosError };

/**
 * Data Export Types & API (unchanged from main)
 */
export type DataExportStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "EXPIRED";

export interface DataExportHistoryItem {
  id: string;
  status: DataExportStatus;
  createdAt: string;
  expiresAt: number | null;
  canRedownload: boolean;
  canRequestNewLink: boolean;
  downloadUrl: string | null;
}

export interface DataExportHistoryResponse {
  latest: DataExportHistoryItem | null;
  history: DataExportHistoryItem[];
}

export const dataExportApi = {
  async getHistory() {
    const response = await apiClient.get<DataExportHistoryResponse>(
      "/data-export/history"
    );
    return response.data;
  },

  async requestExport() {
    const response = await apiClient.post<{
      requestId: string;
      status: string;
    }>("/data-export/request");
    return response.data;
  },

  async redownload(requestId: string) {
    const response = await apiClient.post<{ downloadUrl: string }>(
      `/data-export/${requestId}/redownload`
    );
    return response.data;
  },
};