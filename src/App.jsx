import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import PosPage from './pages/PosPage';
import ReportsPage from './pages/ReportsPage';
import PurchasesPage from './pages/PurchasesPage';
import ReturnsPage from './pages/ReturnsPage';
import UsersPage from './pages/UsersPage';
import ProvidersPage from './pages/ProvidersPage';
import RespaldoPage from './pages/RespaldoPage';
import { ROLES, TODOS } from './roles';

function Layout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Header />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

// Qué roles pueden abrir cada pantalla.
// Dentro de cada pantalla, solo el capturista ve los botones de crear/editar/eliminar.
const rutas = [
  { path: '/dashboard', roles: TODOS, element: <DashboardPage /> },
  { path: '/productos', roles: TODOS, element: <ProductsPage /> },
  { path: '/ventas', roles: [ROLES.CAPTURISTA], element: <PosPage /> },
  { path: '/compras', roles: TODOS, element: <PurchasesPage /> },
  { path: '/proveedores', roles: TODOS, element: <ProvidersPage /> },
  { path: '/devoluciones', roles: TODOS, element: <ReturnsPage /> },
  { path: '/reportes', roles: [ROLES.AUDITOR, ROLES.ADMIN], element: <ReportsPage /> },
  { path: '/usuarios', roles: [ROLES.ADMIN], element: <UsersPage /> },
  { path: '/respaldo', roles: [ROLES.ADMIN], element: <RespaldoPage /> },
];

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {rutas.map((r) => (
            <Route
              key={r.path}
              path={r.path}
              element={
                <ProtectedRoute allowedRoles={r.roles}>
                  <Layout>{r.element}</Layout>
                </ProtectedRoute>
              }
            />
          ))}

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
