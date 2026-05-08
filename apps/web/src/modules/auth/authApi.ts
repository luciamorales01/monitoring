import { apiClient } from '../../shared/apiClient';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    organizationId: number;
  };
};

export function login(data: { email: string; password: string; rememberMe?: boolean }) {
  return apiClient<AuthResponse>('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(data),
  });
}

export function register(data: {
  name: string;
  email: string;
  password: string;
  organizationName?: string;
}) {
  return apiClient<AuthResponse>('/auth/register', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      ...data,
      organizationName: data.organizationName ?? data.name,
    }),
  });
}

export function refreshSession(refreshToken: string) {
  return apiClient<AuthResponse>('/auth/refresh', {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ refreshToken }),
  });
}

export function logout(refreshToken: string) {
  return apiClient<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ refreshToken }),
  });
}

export function forgotPassword(email: string) {
  return apiClient<{ message: string; resetUrl?: string; resetToken?: string }>(
    '/auth/forgot-password',
    {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email }),
    },
  );
}

export function resetPassword(data: { token: string; password: string }) {
  return apiClient<{ success: boolean }>('/auth/reset-password', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(data),
  });
}

export function changePassword(data: { currentPassword: string; newPassword: string }) {
  return apiClient<{ success: boolean }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMe() {
  return apiClient<AuthResponse['user']>('/auth/me');
}


export function acceptInvitation(data: { token: string; name: string; password: string }) {
  return apiClient<AuthResponse>('/auth/accept-invitation', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(data),
  });
}
