import api from './api';
import { useAuthStore, type AuthUser } from '@/store/auth.store';

export const authService = {
  async login(data: any) {
    const response = await api.post('/auth/login', data);
    const payload = response.data.data;
    if (payload?.accessToken && payload?.user) {
      useAuthStore.getState().setAuth(payload.accessToken, payload.user as AuthUser);
    }
    return payload;
  },

  async register(data: any) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async logout() {
    await api.post('/auth/logout');
    useAuthStore.getState().clear();
  },

  getCurrentUser() {
    return useAuthStore.getState().user;
  },

  updateStoredUser(user: AuthUser) {
    const current = useAuthStore.getState().user;
    useAuthStore.getState().setUser({
      ...(current || {}),
      ...(user || {}),
    } as AuthUser);
  },

  async initialize() {
    try {
      const refreshResponse = await api.post('/auth/refresh');
      const accessToken = refreshResponse.data.data.accessToken as string;
      useAuthStore.getState().setAccessToken(accessToken);

      const meResponse = await api.get('/users/me');
      useAuthStore.getState().setUser(meResponse.data.data as AuthUser);
    } catch {
      useAuthStore.getState().clear();
    }
  }
};
