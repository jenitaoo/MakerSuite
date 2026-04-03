import apiClient from "./api";

let cachedUser: any = null;

export const authService = {
  signup: async (userData: {
    username: string;
    email: string;
    full_name: string;
    password: string;
    password2: string;
  }) => {
    const response = await apiClient.post("/api/auth/register/", userData);
    return response.data;
  },

  login: async (credentials: { username: string; password: string }) => {
    const response = await apiClient.post("/api/auth/login/", credentials);
    cachedUser = response.data.user;
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post("/api/auth/logout/");
    cachedUser = null;
    return response.data;
  },

  getCurrentUser: async () => {
    if (cachedUser) return cachedUser;
    try {
      const response = await apiClient.get("/api/auth/user/");
      cachedUser = response.data;
      return cachedUser;
    } catch {
      return null;
    }
  },

  updateProfile: async (data: FormData) => {
    const response = await apiClient.patch("/api/auth/profile/", data, {
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
    const response = await apiClient.post("/api/auth/change-password/", data);
    return response.data;
  },
};