import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token?: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export default api;
