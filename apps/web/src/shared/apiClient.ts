import { tokenStorage } from './tokenStorage';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenStorage.get();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'Error en la petición');
  }

  return response.json();
}