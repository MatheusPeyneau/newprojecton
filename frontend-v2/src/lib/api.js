import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('fluxscale.token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fluxscale.token');
      localStorage.removeItem('fluxscale.user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
