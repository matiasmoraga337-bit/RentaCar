const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export const tokenKey = 'rentacar_token';
export const refreshTokenKey = 'rentacar_refresh';

interface ApiError {
  message?: string;
}

function buildUrl(path: string): string {
  return `${API_URL}${path}`;
}

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(tokenKey);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem(refreshTokenKey);

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      token?: string;
      refreshToken?: string;
    };

    if (!response.ok || !data.token) {
      return false;
    }

    sessionStorage.setItem(tokenKey, data.token);
    if (data.refreshToken) {
      sessionStorage.setItem(refreshTokenKey, data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function clearSession() {
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(refreshTokenKey);
}

async function rawFetch(path: string, options: RequestInit): Promise<Response> {
  return fetch(buildUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response = await rawFetch(path, options);

  if (response.status === 401 && sessionStorage.getItem(refreshTokenKey)) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await rawFetch(path, options);
    }
  }

  const data = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw new Error(data.message ?? 'No fue posible completar la solicitud.');
  }

  return data;
}

export { API_URL };