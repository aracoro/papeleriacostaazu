import { useEffect, useState } from 'react';
import {
  createUsuario,
  getUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  getVentasPorRango,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { ROLES, ETIQUETA_ROL } from '../roles';

const rolesDisponibles = [ROLES.CAPTURISTA, ROLES.AUDITOR, ROLES.ADMIN];

const DESCRIPCION_ROL = {
  administrador: 'Usuarios y respaldos; consulta lo demás',
  capturista: 'Ventas, compras, devoluciones y catálogos',
  auditor: 'Solo consulta',
};

const formVacio = { nombre: '', correo: '', rol: ROLES.CAPTURISTA, password: '' };

export default function UsersPage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [logs, setLogs] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(formVacio);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    const [uRes, vRes] = await Promise.all([getUsuarios(), getVentasPorRango()]);
    if (uRes.error) setMensaje({ tipo: 'error', texto: uRes.error.message });
    setUsuarios(uRes.data || []);
    setLogs((vRes.data || []).slice(0, 40));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const crear = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!form.nombre.trim() || !form.correo.trim() || !form.password.trim()) {
      setMensaje({ tipo: 'error', texto: 'Completa nombre, correo y contraseña' });
      return;
    }

    setLoading(true);
    const { error } = await createUsuario({
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      rol: form.rol,
      password: form.password,
    });
    setLoading(false);

    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo crear el usuario' });
      return;
    }

    setMensaje({ tipo: 'success', texto: 'Usuario creado' });
    setForm(formVacio);
    await cargar();
  };

  const cambiarRol = async (u, rol) => {
    if (rol === u.rol) return;
    const { error } = await actualizarUsuario(u.id, { rol });
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo actualizar el rol' });
      return;
    }
    setMensaje({ tipo: 'success', texto: `Rol de ${u.nombre} cambiado a ${ETIQUETA_ROL[rol]}` });
    await cargar();
  };

  const cambiarEstado = async (u) => {
    const { error } = await actualizarUsuario(u.id, { activo: !u.activo });
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo actualizar el usuario' });
      return;
    }
    setMensaje({ tipo: 'success', texto: `${u.nombre} ${u.activo ? 'desactivado' : 'activado'}` });
    await cargar();
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario ${u.nombre}?`)) return;
    const { error } = await eliminarUsuario(u.id);
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo eliminar el usuario' });
      return;
    }
    setMensaje({ tipo: 'success', texto: 'Usuario eliminado' });
    await cargar();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Usuarios</h2>
        </div>

        {mensaje.texto && (
          <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>{mensaje.texto}</div>
        )}
      </div>

      <div className="card">
        <h3>Nuevo usuario</h3>

        <form className="form grid" onSubmit={crear}>
          <label>
            Nombre completo
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre del usuario" />
          </label>

          <label>
            Correo
            <input type="email" name="correo" value={form.correo} onChange={handleChange} placeholder="correo@papeleria.com" />
          </label>

          <label>
            Rol
            <select name="rol" value={form.rol} onChange={handleChange}>
              {rolesDisponibles.map((rol) => (
                <option key={rol} value={rol}>
                  {ETIQUETA_ROL[rol]}
                </option>
              ))}
            </select>
            <small className="text-muted">{DESCRIPCION_ROL[form.rol]}</small>
          </label>

          <label>
            Contraseña
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="********" />
          </label>

          <div className="form-actions">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>

      <div className="card table-wrapper">
        <h3>Usuarios</h3>

        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const soyYo = u.id === user?.id;
              return (
                <tr key={u.id}>
                  <td>
                    {u.nombre} {soyYo && <span className="pill">Tú</span>}
                  </td>
                  <td>{u.correo}</td>
                  <td>
                    <select value={u.rol} onChange={(e) => cambiarRol(u, e.target.value)} disabled={soyYo}>
                      {rolesDisponibles.map((rol) => (
                        <option key={rol} value={rol}>
                          {ETIQUETA_ROL[rol]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`pill ${u.activo ? 'pill-ok' : 'pill-warn'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td>{u.creado ? new Date(u.creado.replace(' ', 'T')).toLocaleString('es-MX') : ''}</td>
                  <td>
                    {!soyYo && (
                      <div className="btn-group">
                        <button type="button" className="btn secondary" onClick={() => cambiarEstado(u)}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button type="button" className="btn ghost" onClick={() => eliminar(u)}>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {!usuarios.length && (
              <tr>
                <td colSpan="6">Sin usuarios registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card table-wrapper">
        <h3>Últimas ventas</h3>

        <table className="table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Fecha</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.usuario_nombre || 'N/D'}</td>
                <td>{ETIQUETA_ROL[l.usuario_rol] || l.usuario_rol || ''}</td>
                <td>{l.fecha ? new Date(l.fecha.replace(' ', 'T')).toLocaleString('es-MX') : ''}</td>
                <td>${Number(l.total || 0).toFixed(2)}</td>
              </tr>
            ))}

            {!logs.length && (
              <tr>
                <td colSpan="5">Sin actividad reciente.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
