import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { apiClient } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (credential?: string, userInfo?: any) => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('reachinbox_token');
      if (token) {
        try {
          const profile = await apiClient.getMe();
          setUser(profile);
        } catch {
          localStorage.removeItem('reachinbox_token');
          setUser(null);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const loginWithGoogle = async (credential?: string, userInfo?: any) => {
    const data = await apiClient.loginWithGoogle(credential, userInfo);
    setUser(data.user);
  };

  const loginWithEmail = async (email: string, password?: string) => {
    const data = await apiClient.loginWithEmail(email, password);
    setUser(data.user);
  };

  const loginDemo = async () => {
    const data = await apiClient.demoLogin();
    setUser(data.user);
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithEmail,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
