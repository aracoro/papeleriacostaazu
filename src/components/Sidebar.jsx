import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { ROLES, TODOS } from '../roles';

const linksBase = [
  { to: '/dashboard', label: 'Inicio', roles: TODOS },
  { to: '/ventas', label: 'Punto de Venta', roles: [ROLES.CAPTURISTA] },
  { to: '/productos', label: 'Inventario', roles: TODOS },
  { to: '/compras', label: 'Compras', roles: TODOS },
  { to: '/proveedores', label: 'Proveedores', roles: TODOS },
  { to: '/devoluciones', label: 'Devoluciones', roles: TODOS },
  { to: '/reportes', label: 'Reportes', roles: [ROLES.AUDITOR, ROLES.ADMIN] },
  { to: '/usuarios', label: 'Usuarios', roles: [ROLES.ADMIN] },
  { to: '/respaldo', label: 'Respaldos', roles: [ROLES.ADMIN] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const rolActual = user?.rol || '';
  const filteredLinks = linksBase.filter((link) => link.roles.includes(rolActual));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <div>
          <p className="brand-name">Papelería Costa Azul</p>
          <span className="brand-sub">Punto de venta</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {filteredLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
