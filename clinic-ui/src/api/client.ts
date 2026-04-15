import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Expose standard client mapped natively to our FastAPI defaults
const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout preventing unbound blocking
});

// Automate strict Bearer interceptors utilizing the Zustand container loop
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automate global 401 expulsions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
       useAuthStore.getState().logout();
       // Forces active URL mutation routing user back natively. (Handled gracefully via AuthGuard components later)
       window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default apiClient;
