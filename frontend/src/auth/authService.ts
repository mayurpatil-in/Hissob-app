import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { UserInfo } from '../store/authStore';

export interface LoginPayload { email: string; password: string; totp_code?: string; }

export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserInfo;
  requires_2fa?: boolean;
}

export interface TOTPSetupResponse {
  secret: string;
  otpauth_url: string;
  qr_code_base64: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    if (!data.requires_2fa && data.access_token && data.refresh_token && data.user) {
      useAuthStore.getState().setAuth(data.access_token, data.refresh_token, data.user);
    }
    return data;
  },

  async setup2FA(): Promise<TOTPSetupResponse> {
    const { data } = await apiClient.post<TOTPSetupResponse>('/auth/totp/setup');
    return data;
  },

  async verify2FASetup(code: string): Promise<void> {
    await apiClient.post('/auth/totp/verify-setup', { code });
  },

  async disable2FA(password?: string): Promise<void> {
    await apiClient.post('/auth/totp/disable', { password });
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

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
