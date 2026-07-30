import { useState, useEffect, useContext, createContext } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/user')
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    return u;
  };

  const register = async (name, email, password, passwordConfirmation) => {
    const res = await api.post('/register', { name, email, password, password_confirmation: passwordConfirmation });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.post('/logout');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

   const updateUser = (newUser) => {
     setUser(newUser);
   };

   const changePassword = async (currentPassword, newPassword, passwordConfirmation) => {
     const res = await api.put('/user/password', {
       current_password: currentPassword,
       password: newPassword,
       password_confirmation: passwordConfirmation,
     });
     return res.data;
   };

   return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, updateUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}