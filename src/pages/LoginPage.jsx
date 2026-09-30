import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    const { error: loginError } = await login(email, password);
    setLoading(false);
    if (loginError) {
      setError(loginError.message || 'Error al iniciar sesión');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <img src={logo} alt="Logo Papelería Costa Azul" className="login-logo" />
        <h2>Iniciar sesión</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" className="btn primary full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
