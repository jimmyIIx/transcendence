// Application Configuration
export const appConfig = {
  apiUrl: getApiUrl(),
};

function getApiUrl(): string {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In browser, use the current origin (goes through nginx reverse proxy on 443)
    return window.location.origin;
  }
  // Server-side (Node.js/SSR): prefer explicit env var for reliable deployments.
  const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const apiUrlFromEnv = nodeProcess?.env?.['API_URL'];
  if (apiUrlFromEnv && apiUrlFromEnv.trim().length > 0) {
    return apiUrlFromEnv;
  }

  // Safe local fallback for non-containerized runs.
  return 'http://127.0.0.1:8080';
}
