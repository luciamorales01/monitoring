import { apiClient } from './apiClient';

export type UserRole = 'OWNER' | 'ADMIN' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: number;
    name: string;
    slug: string;
  } | null;
};

export type UpdateUserInput = {
  name: string;
  email: string;
  role: UserRole;
};

export const getUsers = async () => {
  return apiClient<User[]>('/users');
};

export const updateUser = async (id: number, data: UpdateUserInput) => {
  return apiClient<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};
