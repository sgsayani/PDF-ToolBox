import { requestJson } from './apiClient';
import type { AuthResponse } from '../types';

export const authApi = {
  register(input: { email: string; password: string; name: string }): Promise<AuthResponse> {
    return requestJson<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  login(input: { email: string; password: string }): Promise<AuthResponse> {
    return requestJson<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  logout(): Promise<void> {
    return requestJson<void>('/auth/logout', { method: 'POST' });
  },

  /** Restores a session from the cookie alone — called once, on app boot. */
  me(): Promise<AuthResponse> {
    return requestJson<AuthResponse>('/auth/me');
  },

  updateProfile(input: { name: string }): Promise<AuthResponse> {
    return requestJson<AuthResponse>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
