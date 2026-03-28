import axios from "axios";
import { useAuthStore } from "@/app/lib/store/authStore";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        await apiClient.post("/auth/refresh");
        return apiClient(error.config);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);
