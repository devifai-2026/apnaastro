import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!localStorage.getItem('ownerToken')) { setLoading(false); return; }
    try {
      const { data } = await Platform.me();
      setOwner(data.data);
    } catch {
      localStorage.removeItem('ownerToken');
      setOwner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await Platform.login(email, password);
    localStorage.setItem('ownerToken', data.data.token);
    setOwner(data.data.owner);
    return data.data.owner;
  };

  const logout = () => {
    localStorage.removeItem('ownerToken');
    setOwner(null);
  };

  return (
    <AuthContext.Provider value={{ owner, loading, login, logout, isOwner: owner?.role === 'owner' }}>
      {children}
    </AuthContext.Provider>
  );
}
