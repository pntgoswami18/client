import axios from 'axios';

// Shared axios instance for all API calls. withCredentials so the httpOnly
// session cookie set by POST /api/auth/login is sent on every request.
const client = axios.create({ withCredentials: true });

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default client;
