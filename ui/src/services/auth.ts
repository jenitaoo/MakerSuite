import apiClient from "./api";
import { API_URL } from "./api";

let cachedUser: any = null;

export const authService = {
  signup: async (userData: {
    username: string;
    email: string;
    full_name: string;
    password: string;
    password2: string;
  }) => {
    const response = await apiClient.post(`${API_URL}/api/auth/register/`, userData);
    return response.data;
  },

  login: async (credentials: { username: string; password: string }) => {
    const response = await apiClient.post(`${API_URL}/api/auth/login/`, credentials);
    cachedUser = response.data.user;
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post(`${API_URL}/api/auth/logout/`);
    cachedUser = null;
    return response.data;
  },

  getCurrentUser: async () => {
    if (cachedUser) return cachedUser;
    try {
      const response = await apiClient.get(`${API_URL}/api/auth/user/`);
      cachedUser = response.data;
      return cachedUser;
    } catch {
      return null;
    }
  },

  updateProfile: async (data: FormData) => {
    const response = await apiClient.patch(`${API_URL}/api/auth/profile/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    cachedUser = response.data;
    return response.data;
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    const response = await apiClient.post(`${API_URL}/api/auth/change-password/`, data);
    return response.data;
  },
};