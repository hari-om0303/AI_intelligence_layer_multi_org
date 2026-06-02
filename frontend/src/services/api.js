import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Smart Rate Limit Feedback
    const remaining = response.headers['ratelimit-remaining'];
    const limit = response.headers['ratelimit-limit'];
    
    if (remaining && limit) {
      const remainingInt = parseInt(remaining, 10);
      const limitInt = parseInt(limit, 10);
      
      // If we used more than 80% of our limit, show a warning
      if (remainingInt < (limitInt * 0.2) && remainingInt > 0) {
         window.dispatchEvent(new CustomEvent('rate-limit-warning', { detail: { remaining: remainingInt } }));
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-error'));
    }
    if (error.response && error.response.status === 429) {
      window.dispatchEvent(new Event('rate-limit-exceeded'));
    }
    return Promise.reject(error);
  }
);

export default api;
