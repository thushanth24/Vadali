
import React, { createContext, useState, ReactNode, useEffect, useCallback, useContext } from 'react';
import { User } from '../types';
import { apiLogin, refreshToken as refreshTokenApi } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface AuthTokens {
  token: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('authTokens');
        const storedUser = localStorage.getItem('user');
        
        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          setAuthTokens(tokens);
          setUser(JSON.parse(storedUser));
          
          // Set up token refresh interval
          setupTokenRefresh(tokens.refreshToken);
        }
      } catch (error) {
        console.error('Failed to initialize auth state', error);
        localStorage.removeItem('authTokens');
        localStorage.removeItem('user');
      } finally {
        setInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up token refresh interval
  const setupTokenRefresh = useCallback((refreshToken: string) => {
    // Refresh token 5 minutes before it expires (15 minutes - 5 minutes = 10 minutes)
    const refreshInterval = 10 * 60 * 1000; // 10 minutes
    
    const intervalId = setInterval(async () => {
      try {
        // Get the current tokens
        const currentTokens = JSON.parse(localStorage.getItem('authTokens') || '{}');
        
        // Call refreshToken without arguments since it uses the stored refresh token
        const newToken = await refreshTokenApi();
        
        if (newToken) {
          const newTokens = {
            ...currentTokens,
            token: newToken
          };
          
          // Update auth tokens in state and storage
          setAuthTokens(newTokens);
          localStorage.setItem('authTokens', JSON.stringify(newTokens));
        } else {
          // If refresh fails, log the user out
          await logout();
        }
      } catch (error) {
        console.error('Failed to refresh token', error);
        await logout();
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiLogin({ email, password });
      
      if (response) {
        const { token, refreshToken, user: userData } = response;
        
        // Store tokens and user data
        const tokens = { token, refreshToken };
        setAuthTokens(tokens);
        setUser(userData);
        
        localStorage.setItem('authTokens', JSON.stringify(tokens));
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Set up token refresh
        setupTokenRefresh(refreshToken);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call logout API if needed
      // await apiLogout();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      // Clear auth state
      setUser(null);
      setAuthTokens(null);
      localStorage.removeItem('authTokens');
      localStorage.removeItem('user');
    }
  };

  const value = { 
    user, 
    login, 
    logout, 
    isAuthenticated: !!user 
  };

  return (
    <AuthContext.Provider value={value}>
      {initializing ? (
        <LoadingSpinner label="Checking authentication..." fullScreen />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
