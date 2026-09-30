/** api.ts — Axios API client with auth interceptors. */
import axios from 'axios';
import { clearAuthStorage } from '@/lib/auth-client';

const api = axios.create({ baseURL: '/api', timeout: 180_000 });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response && err.message === 'Network Error' && typeof window !== 'undefined') {
      err.message = 'Cannot reach the API. Ensure u-api is running (docker compose ps) and try again.';
    }
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      clearAuthStorage();
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
