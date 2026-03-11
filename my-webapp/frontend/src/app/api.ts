const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
// Note: All API calls in the app should use `${API_BASE}/api/...`
export default API_BASE;

/**
 * Custom fetch wrapper that includes the app_password from localStorage 
 * in the X-App-Password header.
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  // Ensure we are in the browser
  const isBrowser = typeof window !== 'undefined';
  const password = isBrowser ? localStorage.getItem('app_password') : '';
  const facilityId = isBrowser ? localStorage.getItem('selected_facility_id') : '';
  
  // Create final URL with facility_id for GET requests
  let finalUrl = url;
  if (facilityId && isBrowser && (!options.method || options.method.toUpperCase() === 'GET')) {
    try {
      const isRelative = !url.startsWith('http');
      const urlObj = isRelative ? new URL(url, 'http://api-internal') : new URL(url);
      
      urlObj.searchParams.set('facility_id', facilityId);
      finalUrl = isRelative ? urlObj.toString().replace('http://api-internal', '') : urlObj.toString();
      
      console.log(`[API] Modified URL: ${url} -> ${finalUrl} (facility_id=${facilityId})`);
    } catch (e) {
      console.warn("Failed to append facility_id to URL:", url, e);
    }
  } else if (isBrowser && (!options.method || options.method.toUpperCase() === 'GET')) {
      console.warn(`[API] facility_id is MISSING for GET request: ${url}`);
  }
  
  const headers = new Headers(options.headers || {});
  if (password) {
    headers.set('X-App-Password', password);
  }

  return fetch(finalUrl, {
    ...options,
    headers,
  });
};

