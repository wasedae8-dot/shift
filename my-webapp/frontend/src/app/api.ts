// Base API URL — falls back to localhost for local development
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export default API_BASE;
