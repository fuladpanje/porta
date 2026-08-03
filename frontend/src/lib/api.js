import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : `${window.location.origin}/api`
);

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const stockApi = {
  searchSymbols: (query, force = false) => api.get(`/stocks/symbols?q=${encodeURIComponent(query)}${force ? '&force=1' : ''}`),
  refreshPrices: (manual = false) => api.post('/stocks/refresh', { manual }),
};

export const favoritesApi = {
  get: () => api.get('/favorites'),
  toggle: (symbol) => api.post('/favorites/toggle', { symbol }),
};

export default api;