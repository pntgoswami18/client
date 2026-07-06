import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from '../api/client';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setStaff(response.data.staff);
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    setUnauthorizedHandler(() => setStaff(null));
  }, [refresh]);

  const login = async (username, password) => {
    const response = await axios.post('/api/auth/login', { username, password });
    setStaff(response.data.staff);
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setStaff(null);
  };

  return (
    <AuthContext.Provider value={{ staff, isAuthenticated: !!staff, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
