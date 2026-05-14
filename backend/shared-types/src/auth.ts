export type UserRole = 'OWNER' | 'ADMIN' | 'VIEWER';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organizationId: number;
}