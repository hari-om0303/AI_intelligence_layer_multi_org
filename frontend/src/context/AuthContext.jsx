import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        console.error('Failed to fetch user', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Listen to global auth errors from api interceptor
    const handleAuthError = () => {
      setUser(null);
    };
    window.addEventListener('auth-error', handleAuthError);

    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    // optionally re-fetch /auth/me to get populated orgId if needed, 
    // but the backend should ideally send it populated.
  };

  const register = async (name, email, password, organizationName) => {
    const { data } = await api.post('/auth/register', { name, email, password, organizationName });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const upgradeUserPlan = async () => {
    const { data } = await api.patch('/organizations/upgrade');
    // Update local user state
    setUser({
      ...user,
      orgId: {
        ...user.orgId,
        subscriptionPlan: 'PRO'
      }
    });
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, upgradeUserPlan }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
