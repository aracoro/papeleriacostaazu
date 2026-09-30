import { useEffect, useMemo, useState } from 'react';

import { getProveedores, getProveedorProductos, registrarCompra, getCompras } from '../api';
import { useAuth } from '../context/AuthContext';
import { puedeEscribir } from '../roles';

async function apiGet(fn) {
  const { data, error } = await fn();
  if (error) throw error;
  return { data };
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const editable = puedeEscribir(user);
  const [compras, setCompras] = useState([]);

  const [modo, setModo] = useState('existente');
  const [proveedores, setProveedores] = useState([]);
  const [productosProveedor, setProductosProveedor] = useState([]);
  const [todasRelaciones, setTodasRelaciones] = useState([]);

  const [form, setForm] = useState({
    proveedor_id: '',
    proveedor_producto_id: '',
    nombre_producto: '',
    categoria: '',
    marca: '',
    presentacion: '',
    sku: '',
    codigo_barras: '',
    descripcion: '',
    unidad: 'pieza',
    precio_venta: '',
    stock_minimo: '',
    cantidad: '',
    costo: '',
    num_fact: '',
    fecha: new Date().toISOString().slice(0, 10),
    codigo_proveedor: '',
    notas: '',
  });

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  useEffect(() => {
    cargarCatalogos();
    cargarCompras();
  }, []);

  async function cargarCompras() {
    const { data } = await getCompras();
    setCompras(data || []);
  }

  useEffect(() => {
    if (!form.proveedor_id) {
      setProductosProveedor([]);
      setForm((prev) => ({ ...prev, proveedor_producto_id: '' }));
      return;
    }
    cargarProductosProveedor(form.proveedor_id);
  }, [form.proveedor_id]);

  async function cargarCatalogos() {
    setLoadingCatalogos(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const prov = await apiGet(getProveedores);
      setProveedores(Array.isArray(prov.data) ? prov.data : []);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudieron cargar los proveedores' });
    } finally {
      setLoadingCatalogos(false);
    }
  }

  async function cargarProductosProveedor(proveedorId) {
    try {
      const res = await apiGet(() => getProveedorProductos(proveedorId));
      // Solo los productos que el proveedor surte actualmente
      setProductosProveedor(Array.isArray(res.data) ? res.data.filter((x) => Number(x.activo)) : []);
    } catch (error) {
      setProductosProveedor([]);
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudieron cargar los productos del proveedor' });
    }
  }

  const productoSeleccionado = useMemo(() => {
    return productosProveedor.find(
      (item) => String(item.id) === String(form.proveedor_producto_id)
    );
  }, [productosProveedor, form.proveedor_producto_id]);

  async function cargarTodasRelaciones() {
    const { data } = await getProveedorProductos();
    setTodasRelaciones(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    cargarTodasRelaciones();
  }, []);

  // Otros proveedores que surten el producto elegido, del más barato al más caro
  const otrosProveedores = useMemo(() => {
    if (!productoSeleccionado) return [];
    return todasRelaciones
      .filter(
        (r) =>
          Number(r.producto_id) === Number(productoSeleccionado.producto_id) &&
          Number(r.activo) &&
          Number(r.id) !== Number(productoSeleccionado.id)
      )
      .sort((a, b) => Number(a.costo_actual) - Number(b.costo_actual));
  }, [todasRelaciones, productoSeleccionado]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'proveedor_id' ? { proveedor_producto_id: '' } : {}),
      // Al elegir el producto se propone el último costo con ese proveedor
      ...(name === 'proveedor_producto_id'
        ? { costo: String(productosProveedor.find((x) => String(x.id) === String(value))?.costo_actual ?? prev.costo) }
        : {}),
    }));
  }

  function resetForm(keepProveedor = '') {
    setForm({
      proveedor_id: keepProveedor,
      proveedor_producto_id: '',
      nombre_producto: '',
      categoria: '',
      marca: '',
      presentacion: '',
      sku: '',
      codigo_barras: '',
      descripcion: '',
      unidad: 'pieza',
      precio_venta: '',
      stock_minimo: '',
      cantidad: '',
      costo: '',
      num_fact: '',
      fecha: new Date().toISOString().slice(0, 10),
      codigo_proveedor: '',
      notas: '',
    });
    setModo('existente');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!form.proveedor_id || !form.cantidad || !form.costo || !form.fecha) {
      setMensaje({ tipo: 'error', texto: 'Completa los campos obligatorios' });
      return;
    }

    if (modo === 'existente' && !form.proveedor_producto_id) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un producto existente' });
      return;
    }

    if (modo === 'nuevo' && !form.nombre_producto.trim()) {
      setMensaje({ tipo: 'error', texto: 'Escribe el nombre del producto nuevo' });
      return;
    }

    setLoading(true);

    try {
      const notasFinales = [form.num_fact ? `Factura capturada: ${form.num_fact}` : '', form.notas]
        .filter(Boolean)
        .join(' | ');

      const payload =
        modo === 'existente'
          ? {
              modo: 'existente',
              proveedor_id: Number(form.proveedor_id),
              proveedor_producto_id: Number(form.proveedor_producto_id),
              cantidad: Number(form.cantidad),
              costo: Number(form.costo),
              fecha: form.fecha,
              notas: notasFinales,
            }
          : {
              modo: 'nuevo',
              proveedor_id: Number(form.proveedor_id),
              nombre_producto: form.nombre_producto.trim(),
              categoria: form.categoria.trim() || null,
              marca: form.marca.trim() || null,
              presentacion: form.presentacion.trim() || null,
              sku: form.sku.trim() || null,
              codigo_barras: form.codigo_barras.trim() || null,
              descripcion: form.descripcion.trim() || null,
              unidad: form.unidad.trim() || 'pieza',
              precio_venta: form.precio_venta ? Number(form.precio_venta) : 0,
              stock_minimo: form.stock_minimo ? Number(form.stock_minimo) : 0,
              cantidad: Number(form.cantidad),
              costo: Number(form.costo),
              fecha: form.fecha,
              notas: notasFinales,
              codigo_proveedor: form.codigo_proveedor.trim() || null,
            };

      const { error: errCompra } = await registrarCompra(payload);
      if (errCompra) throw errCompra;

      setMensaje({
        tipo: 'success',
        texto: modo === 'nuevo'
          ? 'Compra nueva registrada correctamente'
          : 'Compra registrada correctamente',
      });

      const proveedorActual = form.proveedor_id;
      resetForm(proveedorActual);

      if (proveedorActual) {
        await cargarProductosProveedor(proveedorActual);
      }
      await cargarTodasRelaciones();
      await cargarCompras();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo registrar la compra' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>
            Compras
            {!editable && <span className="solo-lectura">Solo lectura</span>}
          </h2>
        </div>

        {mensaje.texto ? (
          <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>
            {mensaje.texto}
          </div>
        ) : null}
      </div>

      {editable && (
      <div className="card">
        <form className="form grid" onSubmit={handleSubmit}>
          <label>
            Proveedor
            <select
              name="proveedor_id"
              value={form.proveedor_id}
              onChange={handleChange}
              disabled={loadingCatalogos || loading}
            >
              <option value="">Selecciona proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo de producto
            <select
              value={modo}
              onChange={(e) => {
                setModo(e.target.value);
                setMensaje({ tipo: '', texto: '' });
                setForm((prev) => ({
                  ...prev,
                  proveedor_producto_id: '',
                  nombre_producto: '',
                  categoria: '',
                  marca: '',
                  presentacion: '',
                  sku: '',
                  codigo_barras: '',
                  descripcion: '',
                  unidad: 'pieza',
                  precio_venta: '',
                  stock_minimo: '',
                  codigo_proveedor: '',
                }));
              }}
              disabled={loading}
            >
              <option value="existente">Producto existente</option>
              <option value="nuevo">Nuevo producto</option>
            </select>
          </label>

          {modo === 'existente' ? (
            <label>
              Producto
              <select
                name="proveedor_producto_id"
                value={form.proveedor_producto_id}
                onChange={handleChange}
                disabled={!form.proveedor_id || loading}
              >
                <option value="">
                  {form.proveedor_id ? 'Selecciona producto' : 'Primero selecciona proveedor'}
                </option>
                {productosProveedor.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.producto_nombre} · ${Number(p.costo_actual || 0).toFixed(2)} · stock {p.producto_stock}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Nombre del producto
              <input
                type="text"
                name="nombre_producto"
                value={form.nombre_producto}
                onChange={handleChange}
                disabled={loading}
              />
            </label>
          )}

          <label>
            Cantidad
            <input
              type="number"
              name="cantidad"
              value={form.cantidad}
              onChange={handleChange}
              min="1"
              step="1"
              disabled={loading}
            />
          </label>

          <label>
            Costo unitario
            <input
              type="number"
              name="costo"
              value={form.costo}
              onChange={handleChange}
              min="0"
              step="0.01"
              disabled={loading}
            />
          </label>

          <label>
            Número de factura
            <input
              type="text"
              name="num_fact"
              value={form.num_fact}
              onChange={handleChange}
              placeholder="Opcional"
              disabled={loading}
            />
          </label>

          <label>
            Fecha
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              disabled={loading}
            />
          </label>

          {modo === 'existente' ? (
            <label className="span-2">
              Descripción
              <input
                type="text"
                value={
                  productoSeleccionado
                    ? `${productoSeleccionado.producto_nombre}${productoSeleccionado.codigo_proveedor ? ` · Código proveedor: ${productoSeleccionado.codigo_proveedor}` : ''}`
                    : ''
                }
                disabled
              />
            </label>
          ) : (
            <>
              <label>
                Categoría
                <input
                  type="text"
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  disabled={loading}
                />
              </label>

              <label>
                Marca
                <input
                  type="text"
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                  disabled={loading}
                />
              </label>

              <label>
                Presentación
                <input
                  type="text"
                  name="presentacion"
                  value={form.presentacion}
                  onChange={handleChange}
                  disabled={loading}
                />
              </label>

              <label>
                SKU
                <input
                  type="text"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  disabled={loading}
                />
              </label>

              <label>
                Código de barras
                <input
                  type="text"
                  name="codigo_barras"
                  value={form.codigo_barras}
                  onChange={handleChange}
                  disabled={loading}
                />
              </label>

              <label>
                Unidad
                <input
                  type="text"
                  name="unidad"
                  value={form.unidad}
                  onChange={handleChange}
                  placeholder="pieza, caja, paquete..."
                  disabled={loading}
                />
              </label>

              <label>
                Precio de venta
                <input
                  type="number"
                  name="precio_venta"
                  value={form.precio_venta}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </label>

              <label>
                Stock mínimo
                <input
                  type="number"
                  name="stock_minimo"
                  value={form.stock_minimo}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  disabled={loading}
                />
              </label>

              <label>
                Código del proveedor
                <input
                  type="text"
                  name="codigo_proveedor"
                  value={form.codigo_proveedor}
                  onChange={handleChange}
                  disabled={loading}
                />
              </label>

              <label className="span-2">
                Descripción
                <input
                  type="text"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  disabled={loading}
                />
              </label>
            </>
          )}

          <label className="span-2">
            Observaciones
            <input
              type="text"
              name="notas"
              value={form.notas}
              onChange={handleChange}
              disabled={loading}
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar compra'}
            </button>
          </div>
        </form>

        {modo === 'existente' && productoSeleccionado && (
          <div className="caja-asignar">
            <h3 style={{ marginTop: 0 }}>Otros proveedores de {productoSeleccionado.producto_nombre}</h3>
            {otrosProveedores.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                {otrosProveedores.map((r) => {
                  const diferencia = Number(r.costo_actual) - Number(productoSeleccionado.costo_actual);
                  return (
                    <div key={r.id} className={`prov-producto${diferencia < 0 ? ' mejor' : ''}`}>
                      <div className="fila">
                        <strong>{r.proveedor_nombre}</strong>
                        <strong>${Number(r.costo_actual).toFixed(2)}</strong>
                      </div>
                      <span className={diferencia < 0 ? 'mejor-precio' : 'muted small'}>
                        {diferencia < 0
                          ? `$${Math.abs(diferencia).toFixed(2)} más barato por pieza`
                          : diferencia > 0
                            ? `$${diferencia.toFixed(2)} más caro por pieza`
                            : 'Mismo costo'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Solo este proveedor surte el producto.</p>
            )}
          </div>
        )}
      </div>
      )}

      <div className="card table-wrapper">
        <h3>Historial de compras</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Registró</th>
              <th>Total</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <tr key={c.id}>
                <td>{c.num_fact}</td>
                <td>{c.fecha ? new Date(String(c.fecha).replace(' ', 'T')).toLocaleString('es-MX') : ''}</td>
                <td>{c.proveedor_nombre}</td>
                <td>{c.usuario_nombre}</td>
                <td>${Number(c.total || 0).toFixed(2)}</td>
                <td>{c.notas || '—'}</td>
              </tr>
            ))}
            {!compras.length && (
              <tr>
                <td colSpan={6}>Sin compras registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}