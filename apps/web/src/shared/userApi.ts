import { apiClient } from "./apiClient";

export type UserRole = "OWNER" | "ADMIN" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

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

  phone?: string;
  timezone?: string;
};

export type UpdateCurrentUserInput = {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
};

export const getCurrentUser = async () => {
  return apiClient<User>("/users/me");
};

export const updateCurrentUser = async (data: UpdateCurrentUserInput) => {
  return apiClient<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export type UserInvitation = {
  id: number;
  email: string;
  role: UserRole;
  organizationId: number;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  inviteUrl?: string;
  inviteToken?: string;
};

export type UpdateUserInput = {
  name: string;
  email: string;
  role: UserRole;
};

export type CreateInvitationInput = {
  email: string;
  role: UserRole;
};

export const getUsers = async () => {
  return apiClient<User[]>("/users");
};

export const updateUser = async (id: number, data: UpdateUserInput) => {
  return apiClient<User>(`/users/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const updateUserStatus = async (
  id: number,
  status: Exclude<UserStatus, "PENDING">,
) => {
  return apiClient<User>(`/users/${encodeURIComponent(String(id))}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const getInvitations = async () => {
  return apiClient<UserInvitation[]>("/users/invitations");
};

export const createInvitation = async (data: CreateInvitationInput) => {
  return apiClient<UserInvitation>("/users/invitations", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const revokeInvitation = async (id: number) => {
  return apiClient<UserInvitation>(
    `/users/invitations/${encodeURIComponent(String(id))}`,
    {
      method: "DELETE",
    },
  );
};
