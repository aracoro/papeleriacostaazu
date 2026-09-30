import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, saveSession, clearSession } from '../api';

const AuthContext = createContext(null);

/*
 * La sesión se guarda solo en memoria (ver src/api.js).
 * Al refrescar la página el estado empieza vacío y ProtectedRoute
 * manda al login de inmediato, sin consultar a TiDB.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);

  // Al abrir o refrescar la app no hay sesión: se borra cualquier resto guardado
  useEffect(() => {
    clearSession();
  }, []);

  function saveAuth(dataUser, dataSession) {
    setUser(dataUser || null);
    setSession(dataSession || null);
    saveSession(dataUser, dataSession);
  }

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await loginUser(email, password);
    setLoading(false);

    if (error) return { error };

    saveAuth(data?.user || null, data?.session || null);
    return { data: data?.user || null };
  };

  const logout = async () => {
    setUser(null);
    setSession(null);
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
