'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { AxiosError } from 'axios';

interface AuthContextType {
  isLoading: boolean;
  refreshUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({ isLoading: true, refreshUser: async () => false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAccessToken, isAuthenticated, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const refreshAttempted = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.getMe();
      setUser(data.data);
      return true;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 401) {
        logout();
      }
      return false;
    }
  }, [setUser, logout]);

  useEffect(() => {
    const currentAuthState = useAuthStore.getState().isAuthenticated;

    if (currentAuthState && !refreshAttempted.current) {
      refreshAttempted.current = true;
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
