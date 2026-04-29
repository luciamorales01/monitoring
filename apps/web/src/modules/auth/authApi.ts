import { apiClient } from '../../shared/apiClient';

type AuthResponse = {
  accessToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    organizationId: number;
  };
};

export function login(data: { email: string; password: string }) {
  return apiClient<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function register(data: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}) {
  return apiClient<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMe() {
  return apiClient<AuthResponse['user']>('/auth/me');
}