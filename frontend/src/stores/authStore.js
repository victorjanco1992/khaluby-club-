import { create } from 'zustand';
import api from '../lib/api.js';

const getStored = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};

export const useAuthStore = create((set, get) => ({
  user: getStored('kh_user'),
  token: localStorage.getItem('kh_token'),
  qrDataUrl: null,
  isLoading: false,

  login: async (dni, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/login', { dni, password });
      localStorage.setItem('kh_token', data.token);
      localStorage.setItem('kh_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, qrDataUrl: data.qrDataUrl, isLoading: false });
      return { success: true, role: data.user.role };
    } catch (e) { set({ isLoading: false }); throw e; }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/auth/register', formData);
      localStorage.setItem('kh_token', data.token);
      localStorage.setItem('kh_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, qrDataUrl: data.qrDataUrl, isLoading: false });
      return { success: true };
    } catch (e) { set({ isLoading: false }); throw e; }
  },

  refreshMe: async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      localStorage.setItem('kh_user', JSON.stringify(data.user));
      set({ user: data.user, qrDataUrl: data.qrDataUrl });
    } catch {}
  },

  logout: () => {
    localStorage.removeItem('kh_token');
    localStorage.removeItem('kh_user');
    set({ user: null, token: null, qrDataUrl: null });
  },

  isAdmin: () => get().user?.role === 'ADMIN',
  isAuthenticated: () => !!get().token && !!get().user,
}));