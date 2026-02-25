import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const API = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export default API;
