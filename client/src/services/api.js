import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // Enables transmitting HttpOnly cookies cross-origin/same-origin
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token as Bearer header if available as fallback
api.interceptors.request.use(
  (config) => {
    // If a token was stored, send it as authorization header too for hybrid support
    const token = localStorage.getItem('novastat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authentication expiry and extract response data
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;

    // Handle session expiry on protected pages (do not redirect if already on /login or /register)
    if (status === 401) {
      const isAuthRoute =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';

      // Only perform global redirect if this was an authenticated session call that expired unexpectedly
      if (!isAuthRoute && localStorage.getItem('novastat_session_active')) {
        localStorage.removeItem('novastat_session_active');
        localStorage.removeItem('novastat_token');
        localStorage.removeItem('novastat_user');
        window.location.href = `/login?expired=true&redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    const customMessage =
      responseData?.message ||
      responseData?.errors?.[0]?.message ||
      error.message ||
      'An unexpected error occurred';

    const customError = new Error(customMessage);
    customError.status = status;
    customError.data = responseData;
    customError.code = responseData?.errors?.[0]?.code || responseData?.code;

    return Promise.reject(customError);
  }
);

export default api;
