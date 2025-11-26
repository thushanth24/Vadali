import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { compare, hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Allow overriding via env; default to 1 hour to reduce frequent logouts
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, 10);
};

export const comparePasswords = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  if (!password || !hashedPassword) return false;
  return compare(password, hashedPassword);
};

export const generateToken = (userId: string, email: string, role: string, expiresIn: string = JWT_EXPIRES_IN): string => {
  return sign({ userId, email, role }, JWT_SECRET, { expiresIn });
};

export const generateRefreshToken = (): string => {
  return uuidv4();
};

export const verifyToken = (token: string): TokenPayload => {
  return verify(token, JWT_SECRET) as TokenPayload;
};

export const getTokenFromHeaders = (headers: any): string | null => {
  if (!headers) return null;
  
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
};

export const createAuthResponse = (user: any) => {
  const { id, email, role, name, avatarUrl } = user;
  const token = generateToken(id, email, role);
  const refreshToken = generateRefreshToken();
  
  return {
    user: { 
      id, 
      email, 
      role, 
      name: name || '', 
      avatarUrl: avatarUrl || `https://picsum.photos/seed/${Date.now()}/100/100` 
    },
    token,
    refreshToken
  };
};
