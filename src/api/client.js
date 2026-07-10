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

// For call sites still using raw fetch() against /api/* routes — routes them
// through the same 401 handler as the axios client above.
export async function apiFetch(url, options) {
  const response = await fetch(url, options);
  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }
  return response;
}

export default client;
