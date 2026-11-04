import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and verify authentication session on mount (refresh persistence)
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const currentUser = await authService.getMe();
        if (isMounted) {
          setUser(currentUser);
          localStorage.setItem('novastat_session_active', 'true');
        }
      } catch {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem('novastat_session_active');
          localStorage.removeItem('novastat_token');
          localStorage.removeItem('novastat_user');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await authService.login({ email, password });
      setUser(result.user);
      localStorage.setItem('novastat_session_active', 'true');
      if (result.token) {
        localStorage.setItem('novastat_token', result.token);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const result = await authService.register(userData);
      setUser(result.user);
      localStorage.setItem('novastat_session_active', 'true');
      if (result.token) {
        localStorage.setItem('novastat_token', result.token);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setError(null);
      localStorage.removeItem('novastat_session_active');
      localStorage.removeItem('novastat_token');
      localStorage.removeItem('novastat_user');
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
