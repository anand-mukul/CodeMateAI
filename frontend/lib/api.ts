/**
 * CodeMate Web Client — API Service Layer
 * Connects to the FastAPI backend (Render production or custom env).
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://codemate-backend-wsi1.onrender.com').replace(/\/$/, '');

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function parseErrorMessage(data: any, fallback = 'Request failed. Please check credentials.'): string {
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (data.detail && typeof data.detail === 'object') {
    return data.detail.detail || data.detail.message || data.detail.code || JSON.stringify(data.detail);
  }
  if (typeof data.message === 'string') return data.message;
  return fallback;
}

export async function fetchWithAuth<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('codemate_web_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(data));
  }

  return data as T;
}
