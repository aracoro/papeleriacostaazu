import { useAuth } from '../context/AuthContext';
import { ETIQUETA_ROL } from '../roles';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div>
        <h1 className="header-title">Papelería Costa Azul</h1>
      </div>
      <div className="header-actions">
        <div className="user-chip">
          <span className="user-name">{user?.nombre || 'Usuario'}</span>
          <span className="user-role">{ETIQUETA_ROL[user?.rol] || user?.rol}</span>
        </div>
        <button className="btn secondary" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
