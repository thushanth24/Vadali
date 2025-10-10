import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../types';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  refreshToken?: string;
}

export const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
  const now = new Date().toISOString();
  return {
    ...userData,
    id: `u_${uuidv4()}`,
    createdAt: now,
    updatedAt: now,
  };
};
