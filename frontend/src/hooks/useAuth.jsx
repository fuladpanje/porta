import { useState, useEffect, useRef, useContext, createContext } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

// Poll /user every 60s so schedule/time-range changes by admin
// are reflected in all sessions without a page reload.
const USER_POLL_MS = 60_000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

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

  // Keep user object fresh: re-fetch every minute so admin schedule
  // changes (interval, time range, enabled flag) apply to all users
  // without requiring a page reload.
  useEffect(() => {
    if (!token) return;

    pollRef.current = setInterval(() => {
      api.get('/user')
        .then((res) => setUser(res.data.user))
        .catch(() => {}); // silently ignore — next tick will retry
    }, USER_POLL_MS);

    return () => clearInterval(pollRef.current);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    return u;
  };

  const register = async (username, email, password, passwordConfirmation) => {
    const res = await api.post('/register', { username, email, password, password_confirmation: passwordConfirmation });
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