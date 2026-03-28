import { useAuthStore } from "@/app/lib/store/authStore";
import { apiClient } from "./client";

export const authService = {
  async login(credentials: { email: string; password: string }) {
    const res = await apiClient.post("/auth/login", credentials);
    useAuthStore.getState().setAuth(res.data.user);
    return res.data;
  },
  async logout() {
    try { await apiClient.post("/auth/logout"); }
    finally { useAuthStore.getState().clearAuth(); }
  },
};
