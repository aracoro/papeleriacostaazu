import { useEffect, useMemo, useState } from 'react';
import {
  getProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  getProveedorProductos,
  getProductos,
  asignarProductoProveedor,
  actualizarProductoProveedor,
  quitarProductoProveedor,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { puedeEscribir } from '../roles';

const proveedorVacio = { nombre: '', telefono: '', rfc: '', correo: '', direccion: '' };
const asignarVacio = { producto_id: '', codigo_proveedor: '', costo_actual: '' };
const dinero = (v) => `$${Number(v || 0).toFixed(2)}`;

export default function ProvidersPage() {
  const { user } = useAuth();
  const editable = puedeEscribir(user);

  const [proveedores, setProveedores] = useState([]);
  const [relaciones, setRelaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [formProveedor, setFormProveedor] = useState(null); // null = cerrado; {id?, ...campos}
  const [asignar, setAsignar] = useState(asignarVacio);
  const [edicion, setEdicion] = useState(null); // {id, codigo_proveedor, costo_actual}
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    const [pRes, rRes, prodRes] = await Promise.all([getProveedores(), getProveedorProductos(), getProductos()]);
    if (pRes.error) setMensaje({ tipo: 'error', texto: pRes.error.message });
    const lista = pRes.data || [];
    setProveedores(lista);
    setRelaciones(rRes.data || []);
    setProductos(prodRes.data || []);
    setSeleccionado((actual) => actual ?? lista[0]?.id ?? null);
  };

  const aviso = (tipo, texto) => setMensaje({ tipo, texto });

  /* ---------- Datos calculados ---------- */

  const conteo = useMemo(() => {
    const m = new Map();
    relaciones.forEach((r) => {
      const c = m.get(Number(r.proveedor_id)) || { total: 0, activos: 0 };
      c.total += 1;
      if (Number(r.activo)) c.activos += 1;
      m.set(Number(r.proveedor_id), c);
    });
    return m;
  }, [relaciones]);

  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter((p) => `${p.nombre} ${p.rfc || ''}`.toLowerCase().includes(q));
  }, [proveedores, busqueda]);

  const proveedor = proveedores.find((p) => Number(p.id) === Number(seleccionado)) || null;

  const productosDelProveedor = useMemo(() => {
    if (!proveedor) return [];
    return relaciones
      .filter((r) => Number(r.proveedor_id) === Number(proveedor.id))
      .map((r) => ({
        ...r,
        otros: relaciones
          .filter((o) => Number(o.producto_id) === Number(r.producto_id) && Number(o.proveedor_id) !== Number(proveedor.id) && Number(o.activo))
          .map((o) => o.proveedor_nombre),
      }))
      .sort((a, b) => Number(b.activo) - Number(a.activo) || String(a.producto_nombre).localeCompare(b.producto_nombre));
  }, [relaciones, proveedor]);

  // Productos que todavía no surte (activos) este proveedor
  const productosParaAsignar = useMemo(() => {
    if (!proveedor) return [];
    const yaActivos = new Set(productosDelProveedor.filter((r) => Number(r.activo)).map((r) => Number(r.producto_id)));
    return productos
      .filter((p) => !yaActivos.has(Number(p.id)))
      .map((p) => ({
        ...p,
        surtidoPor: (p.proveedores || []).map((x) => x.proveedor_nombre).join(', '),
      }));
  }, [productos, productosDelProveedor, proveedor]);

  /* ---------- Proveedores ---------- */

  const guardarProveedor = async (e) => {
    e.preventDefault();
    if (!formProveedor.nombre.trim()) return aviso('error', 'El nombre es obligatorio.');
    setGuardando(true);
    const datos = {
      nombre: formProveedor.nombre.trim(),
      telefono: formProveedor.telefono.trim(),
      rfc: formProveedor.rfc.trim(),
      correo: formProveedor.correo.trim(),
      direccion: formProveedor.direccion.trim(),
    };
    const { data, error } = formProveedor.id
      ? await actualizarProveedor(formProveedor.id, datos)
      : await crearProveedor(datos);
    setGuardando(false);
    if (error) return aviso('error', error.message);
    aviso('success', formProveedor.id ? 'Proveedor actualizado.' : 'Proveedor agregado.');
    if (!formProveedor.id && data?.id) setSeleccionado(data.id);
    setFormProveedor(null);
    cargar();
  };

  const borrarProveedor = async () => {
    if (!window.confirm(`¿Eliminar a ${proveedor.nombre}?`)) return;
    const { error } = await eliminarProveedor(proveedor.id);
    if (error) return aviso('error', error.message);
    aviso('success', 'Proveedor eliminado.');
    setSeleccionado(null);
    cargar();
  };

  /* ---------- Productos del proveedor ---------- */

  const asignarProducto = async (e) => {
    e.preventDefault();
    if (!asignar.producto_id) return aviso('error', 'Elige un producto.');
    if (!(Number(asignar.costo_actual) > 0)) return aviso('error', 'Captura el costo.');
    setGuardando(true);
    const { error } = await asignarProductoProveedor({
      proveedor_id: proveedor.id,
      producto_id: Number(asignar.producto_id),
      codigo_proveedor: asignar.codigo_proveedor.trim(),
      costo_actual: Number(asignar.costo_actual),
    });
    setGuardando(false);
    if (error) return aviso('error', error.message);
    aviso('success', 'Producto asignado.');
    setAsignar(asignarVacio);
    cargar();
  };

  const guardarEdicion = async () => {
    if (!(Number(edicion.costo_actual) > 0)) return aviso('error', 'El costo debe ser mayor a cero.');
    const { error } = await actualizarProductoProveedor(edicion.id, {
      codigo_proveedor: edicion.codigo_proveedor,
      costo_actual: Number(edicion.costo_actual),
    });
    if (error) return aviso('error', error.message);
    aviso('success', 'Cambios guardados.');
    setEdicion(null);
    cargar();
  };

  const quitar = async (r) => {
    if (!window.confirm(`¿Quitar ${r.producto_nombre} de ${proveedor.nombre}?`)) return;
    const { data, error } = await quitarProductoProveedor(r.id);
    if (error) return aviso('error', error.message);
    aviso(
      'success',
      data?.accion === 'desactivado'
        ? 'Tiene compras registradas, así que quedó como inactivo.'
        : 'Producto quitado.'
    );
    cargar();
  };

  const reactivar = async (r) => {
    const { error } = await actualizarProductoProveedor(r.id, { activo: true });
    if (error) return aviso('error', error.message);
    aviso('success', 'Producto reactivado.');
    cargar();
  };

  /* ---------- Vista ---------- */

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>
            Proveedores
            {!editable && <span className="solo-lectura">Solo lectura</span>}
          </h2>
        </div>
        {editable && (
          <button type="button" className="btn primary" onClick={() => setFormProveedor({ ...proveedorVacio })}>
            Nuevo proveedor
          </button>
        )}
      </div>

      {mensaje.texto && <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>{mensaje.texto}</div>}

      {editable && formProveedor && (
        <div className="card">
          <h3>{formProveedor.id ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <form className="form grid" onSubmit={guardarProveedor}>
            <label>
              Nombre
              <input value={formProveedor.nombre} onChange={(e) => setFormProveedor({ ...formProveedor, nombre: e.target.value })} required />
            </label>
            <label>
              Teléfono
              <input value={formProveedor.telefono} onChange={(e) => setFormProveedor({ ...formProveedor, telefono: e.target.value })} />
            </label>
            <label>
              RFC
              <input value={formProveedor.rfc} onChange={(e) => setFormProveedor({ ...formProveedor, rfc: e.target.value })} />
            </label>
            <label>
              Correo
              <input type="email" value={formProveedor.correo} onChange={(e) => setFormProveedor({ ...formProveedor, correo: e.target.value })} />
            </label>
            <label>
              Dirección
              <input value={formProveedor.direccion} onChange={(e) => setFormProveedor({ ...formProveedor, direccion: e.target.value })} />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" className="btn ghost" onClick={() => setFormProveedor(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="prov-layout">
        <section className="card" aria-label="Lista de proveedores">
          <label>
            Buscar
            <input type="search" placeholder="Nombre o RFC" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </label>
          <div className="prov-lista" style={{ marginTop: 12 }}>
            {proveedoresFiltrados.map((p) => {
              const c = conteo.get(Number(p.id));
              const detalle = !c ? 'Sin productos asignados' : `${c.activos} producto${c.activos === 1 ? '' : 's'}`;
              const activo = Number(p.id) === Number(seleccionado);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={activo}
                  className={`prov-item${activo ? ' activo' : ''}`}
                  onClick={() => {
                    setSeleccionado(p.id);
                    setEdicion(null);
                    setAsignar(asignarVacio);
                  }}
                >
                  <strong>{p.nombre}</strong>
                  <small>{detalle}</small>
                </button>
              );
            })}
            {!proveedoresFiltrados.length && <p className="muted">No hay proveedores.</p>}
          </div>
        </section>

        <section className="card" aria-label="Detalle del proveedor">
          {!proveedor ? (
            <p className="muted">Selecciona un proveedor.</p>
          ) : (
            <>
              <div className="prov-detalle-head">
                <div>
                  <h3 style={{ margin: 0 }}>{proveedor.nombre}</h3>
                  <p className="muted" style={{ margin: '4px 0 0' }}>
                    {[proveedor.rfc && `RFC ${proveedor.rfc}`, proveedor.telefono, proveedor.correo].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                  </p>
                </div>
                {editable && (
                  <div className="acciones">
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() =>
                        setFormProveedor({
                          id: proveedor.id,
                          nombre: proveedor.nombre || '',
                          telefono: proveedor.telefono || '',
                          rfc: proveedor.rfc || '',
                          correo: proveedor.correo || '',
                          direccion: proveedor.direccion || '',
                        })
                      }
                    >
                      Editar datos
                    </button>
                    <button type="button" className="btn peligro" onClick={borrarProveedor}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: 20 }}>Productos que surte</h3>
              <div className="table-wrapper" style={{ padding: 0, boxShadow: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Código</th>
                      <th>Costo</th>
                      <th>También lo surte</th>
                      <th>Estado</th>
                      {editable && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {productosDelProveedor.map((r) => {
                      const enEdicion = edicion?.id === r.id;
                      const activo = Boolean(Number(r.activo));
                      return (
                        <tr key={r.id} style={activo ? undefined : { color: '#5b6573' }}>
                          <td><strong>{r.producto_nombre}</strong></td>
                          <td>
                            {enEdicion ? (
                              <input aria-label="Código del proveedor" value={edicion.codigo_proveedor} onChange={(e) => setEdicion({ ...edicion, codigo_proveedor: e.target.value })} />
                            ) : (
                              r.codigo_proveedor || '—'
                            )}
                          </td>
                          <td>
                            {enEdicion ? (
                              <input aria-label="Costo" type="number" min="0" step="0.01" value={edicion.costo_actual} onChange={(e) => setEdicion({ ...edicion, costo_actual: e.target.value })} />
                            ) : (
                              dinero(r.costo_actual)
                            )}
                          </td>
                          <td>{r.otros.length ? r.otros.map((n) => <span key={n} className="chip">{n}</span>) : <span className="muted">Solo este proveedor</span>}</td>
                          <td>
                            <span className={`estado ${activo ? 'activo' : 'inactivo'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
                          </td>
                          {editable && (
                            <td>
                              <div className="acciones">
                                {enEdicion ? (
                                  <>
                                    <button type="button" className="btn primary sm" onClick={guardarEdicion}>Guardar</button>
                                    <button type="button" className="btn ghost sm" onClick={() => setEdicion(null)}>Cancelar</button>
                                  </>
                                ) : activo ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn secondary sm"
                                      onClick={() => setEdicion({ id: r.id, codigo_proveedor: r.codigo_proveedor || '', costo_actual: r.costo_actual })}
                                    >
                                      Editar
                                    </button>
                                    <button type="button" className="btn peligro sm" onClick={() => quitar(r)}>Quitar</button>
                                  </>
                                ) : (
                                  <button type="button" className="btn secondary sm" onClick={() => reactivar(r)}>Reactivar</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {!productosDelProveedor.length && (
                      <tr>
                        <td colSpan={editable ? 6 : 5} className="muted">Todavía no tiene productos asignados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {editable && (
                <div className="caja-asignar">
                  <h3 style={{ marginTop: 0 }}>Asignar producto</h3>
                  <form className="form grid" onSubmit={asignarProducto}>
                    <label>
                      Producto
                      <select value={asignar.producto_id} onChange={(e) => setAsignar({ ...asignar, producto_id: e.target.value })}>
                        <option value="">Selecciona…</option>
                        {productosParaAsignar.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}{p.surtidoPor ? ` — lo surte ${p.surtidoPor}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Código del proveedor
                      <input value={asignar.codigo_proveedor} onChange={(e) => setAsignar({ ...asignar, codigo_proveedor: e.target.value })} />
                    </label>
                    <label>
                      Costo
                      <input type="number" min="0" step="0.01" value={asignar.costo_actual} onChange={(e) => setAsignar({ ...asignar, costo_actual: e.target.value })} />
                    </label>
                    <button type="submit" className="btn primary" disabled={guardando}>Asignar</button>
                  </form>
                  <p className="nota">Si quitas un producto que ya tiene compras con este proveedor, queda inactivo para no perder el historial.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
