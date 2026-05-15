'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';

interface AuthContextType {
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ isLoading: true, refreshUser: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAccessToken, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data } = await authApi.getMe();
      setUser(data.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    }
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
