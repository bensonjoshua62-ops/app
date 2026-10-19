// Auto-detect backend URL based on current domain for deployment compatibility
export const getBackendUrl = () => {
  // First check environment variable
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  // Fallback: use same origin with /api prefix for production
  const currentOrigin = window.location.origin;
  // If we're on localhost, use the dev backend
  if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
    return 'http://localhost:8001';
  }
  // For deployed environments, use same origin (ingress routes /api to backend)
  return currentOrigin;
};

export const BACKEND_URL = getBackendUrl();
