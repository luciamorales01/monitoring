import type { Request } from 'express';
import type { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  organizationId: number;
  userId: number;
  role?: UserRole;
  email?: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
