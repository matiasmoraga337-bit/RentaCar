const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface ApiError {
  message?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(data.message ?? 'No fue posible completar la solicitud.');
  }

  return data;
}

export { API_URL };
