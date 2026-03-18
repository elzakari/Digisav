import api from './api';

export const authService = {
  async login(data: any) {
    const response = await api.post('/auth/login', data);
    const payload = response.data.data; // backend wraps: { success, data: { user, accessToken, refreshToken } }
    if (payload?.accessToken) {
      localStorage.setItem('accessToken', payload.accessToken);
      localStorage.setItem('refreshToken', payload.refreshToken);
      localStorage.setItem('user', JSON.stringify(payload.user));
    }
    return payload; // return the inner payload so Login.tsx can read payload.user.role
  },

  async register(data: any) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  },

  updateStoredUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }
};
