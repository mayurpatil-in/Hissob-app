import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { UserInfo } from '../store/authStore';

export interface LoginPayload { email: string; password: string; }

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    useAuthStore.getState().setAuth(data.access_token, data.refresh_token, data.user);
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    } finally {
      useAuthStore.getState().logout();
    }
  },

  async me(): Promise<UserInfo> {
    const { data } = await apiClient.get<UserInfo>('/auth/me');
    return data;
  },
};
