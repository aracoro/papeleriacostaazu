import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="card">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return (
      <div className="access-denied">
        <div className="card error">
          <h2>Sin acceso</h2>
          <p>Tu usuario no tiene permiso para entrar a esta sección.</p>
        </div>
      </div>
    );
  }

  return children;
}
