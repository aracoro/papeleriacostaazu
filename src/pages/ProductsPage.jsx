import React, { useEffect, useState } from 'react';
import {
  getProductosPaginado,
  actualizarProducto,
  uploadProductoImagen,
  eliminarProducto,
  getProveedores,
  asignarProductoProveedor,
  quitarProductoProveedor,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { puedeEscribir } from '../roles';

const emptyProducto = {
  id: '',
  codigo_barras: '',
  nombre: '',
  descripcion: '',
  estado: 'activo',
  categoria: '',
  marca: '',
  presentacion: '',
  unidad: 'pieza',
  precio_venta: '',
  costo_promedio: '',
  stock: '',
  stock_minimo: '',
  imagen: '',
};

function ProductsPage() {
  const { user } = useAuth();
  const editable = puedeEscribir(user);
  const [productos, setProductos] = useState([]);
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [filterStock, setFilterStock] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [mostrarEditar, setMostrarEditar] = useState(false);
  const [proveedoresCat, setProveedoresCat] = useState([]);
  const [filterProveedor, setFilterProveedor] = useState('');
  const [panelId, setPanelId] = useState(null);
  const [formProv, setFormProv] = useState({ proveedor_id: '', codigo_proveedor: '', costo_actual: '' });
  const [formEdit, setFormEdit] = useState(emptyProducto);
  const [fileEdit, setFileEdit] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    cargarProductos(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStock, filterEstado, filterProveedor]);

  useEffect(() => {
    getProveedores().then(({ data }) => setProveedoresCat(data || []));
  }, []);

  const cargarProductos = async (targetPage = page) => {
    setLoading(true);
    setError('');

    const { data, total: count, error: err } = await getProductosPaginado({
      page: targetPage,
      pageSize,
      q: query,
      stockFilter: filterStock,
      estado: filterEstado === 'todos' ? '' : filterEstado,
      proveedor_id: filterProveedor,
    });

    if (err) {
      setError('No se pudieron cargar los productos.');
      setProductos([]);
      setTotal(0);
    } else {
      setProductos(data || []);
      setTotal(count || 0);
    }

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    cargarProductos(1);
  };

  const handleFilterStock = (valor) => {
    setFilterStock(valor);
    setPage(1);
  };

  const handleFilterEstado = (e) => {
    setFilterEstado(e.target.value);
    setPage(1);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormEdit((prev) => ({ ...prev, [name]: value }));
  };

  const limpiarMensajes = () => {
    setError('');
    setMensaje({ tipo: '', texto: '' });
  };

  const resetEditar = () => {
    setFormEdit(emptyProducto);
    setFileEdit(null);
  };

  const buscarParaEditar = async () => {
    limpiarMensajes();

    if (!formEdit.codigo_barras.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un código para buscar.' });
      return;
    }

    const { data, error: err } = await getProductosPaginado({
      page: 1,
      pageSize: 50,
      q: formEdit.codigo_barras.trim(),
      stockFilter: 'todos',
      estado: '',
    });

    if (err || !data?.length) {
      setMensaje({ tipo: 'error', texto: 'No se encontró producto con ese código.' });
      return;
    }

    const exacto =
      data.find(
        (p) => String(p.codigo_barras || '').trim() === formEdit.codigo_barras.trim()
      ) || data[0];

    setFormEdit({
      id: exacto.id || '',
      codigo_barras: exacto.codigo_barras || '',
      nombre: exacto.nombre || '',
      descripcion: exacto.descripcion || '',
      estado: exacto.estado || 'activo',
      categoria: exacto.categoria || '',
      marca: exacto.marca || '',
      presentacion: exacto.presentacion || '',
      unidad: exacto.unidad || 'pieza',
      precio_venta: exacto.precio_venta ?? '',
      costo_promedio: exacto.costo_promedio ?? '',
      stock: exacto.stock ?? '',
      stock_minimo: exacto.stock_minimo ?? '',
      imagen: exacto.imagen || '',
    });
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!formEdit.id) {
      setMensaje({ tipo: 'error', texto: 'Debes buscar un producto antes de guardar.' });
      return;
    }

    let imagenFinal = formEdit.imagen?.trim() || null;

    if (fileEdit) {
      const { data, error: uploadError } = await uploadProductoImagen(fileEdit);
      if (uploadError) {
        setMensaje({
          tipo: 'error',
          texto: `No se pudo subir la imagen: ${uploadError.message || uploadError}`,
        });
        return;
      }
      imagenFinal = data;
    }

    const updates = {
      nombre: formEdit.nombre.trim(),
      descripcion: formEdit.descripcion?.trim() || null,
      estado: formEdit.estado || 'activo',
      categoria: formEdit.categoria?.trim() || null,
      marca: formEdit.marca?.trim() || null,
      presentacion: formEdit.presentacion?.trim() || null,
      unidad: formEdit.unidad?.trim() || 'pieza',
      precio_venta: formEdit.precio_venta ? Number(formEdit.precio_venta) : 0,
      costo_promedio: formEdit.costo_promedio ? Number(formEdit.costo_promedio) : 0,
      stock: formEdit.stock ? Number(formEdit.stock) : 0,
      stock_minimo: formEdit.stock_minimo ? Number(formEdit.stock_minimo) : 0,
      imagen: imagenFinal,
      codigo_barras: formEdit.codigo_barras?.trim() || null,
    };

    const { error: err } = await actualizarProducto(formEdit.id, updates);

    if (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo actualizar el producto.' });
      return;
    }

    setMensaje({ tipo: 'success', texto: 'Producto actualizado.' });
    cargarProductos(page);
  };

  const handleEliminar = async (p) => {
    limpiarMensajes();
    if (!window.confirm(`¿Eliminar el producto "${p.nombre}"?`)) return;
    const { error: err } = await eliminarProducto(p.id);
    if (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo eliminar el producto.' });
      return;
    }
    setMensaje({ tipo: 'success', texto: 'Producto eliminado.' });
    cargarProductos(page);
  };

  const paginar = (delta) => {
    const next = Math.min(Math.max(1, page + delta), totalPages || 1);
    setPage(next);
  };

  const productoPanel = productos.find((p) => Number(p.id) === Number(panelId)) || null;
  const provsPanel = productoPanel?.proveedores || [];
  const costoMinimo = provsPanel.length ? Math.min(...provsPanel.map((x) => Number(x.costo_actual))) : null;
  const provsDisponibles = proveedoresCat.filter(
    (pv) => !provsPanel.some((x) => Number(x.proveedor_id) === Number(pv.id))
  );

  const agregarProveedor = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    if (!formProv.proveedor_id) return setMensaje({ tipo: 'error', texto: 'Elige un proveedor.' });
    if (!(Number(formProv.costo_actual) > 0)) return setMensaje({ tipo: 'error', texto: 'Captura el costo.' });
    const { error: err } = await asignarProductoProveedor({
      proveedor_id: Number(formProv.proveedor_id),
      producto_id: productoPanel.id,
      codigo_proveedor: formProv.codigo_proveedor.trim(),
      costo_actual: Number(formProv.costo_actual),
    });
    if (err) return setMensaje({ tipo: 'error', texto: err.message });
    setMensaje({ tipo: 'success', texto: 'Proveedor agregado.' });
    setFormProv({ proveedor_id: '', codigo_proveedor: '', costo_actual: '' });
    cargarProductos(page);
  };

  const quitarProveedor = async (rel) => {
    if (!window.confirm(`¿Quitar a ${rel.proveedor_nombre} de ${productoPanel.nombre}?`)) return;
    limpiarMensajes();
    const { data, error: err } = await quitarProductoProveedor(rel.id);
    if (err) return setMensaje({ tipo: 'error', texto: err.message });
    setMensaje({
      tipo: 'success',
      texto: data?.accion === 'desactivado' ? 'Tiene compras registradas, así que quedó como inactivo.' : 'Proveedor quitado.',
    });
    cargarProductos(page);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>
            Inventario
            {!editable && <span className="solo-lectura">Solo lectura</span>}
          </h2>
        </div>
        <div className="btn-group">
          <button className={`btn ${view === 'grid' ? 'primary' : 'secondary'}`} onClick={() => setView('grid')}>
            Tarjetas
          </button>
          <button className={`btn ${view === 'table' ? 'primary' : 'secondary'}`} onClick={() => setView('table')}>
            Tabla
          </button>
        </div>
      </div>

      <div className="card">
        <div className="products-toolbar">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Buscar por nombre, marca o código de barras"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn primary" type="submit">
              Buscar
            </button>
          </form>

          <div className="filters-inline">
            <div className="btn-group">
              {['todos', 'con', 'sin'].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  className={`btn ${filterStock === valor ? 'primary' : 'secondary'}`}
                  onClick={() => handleFilterStock(valor)}
                >
                  {valor === 'todos' ? 'Todos' : valor === 'con' ? 'Con existencia' : 'Sin stock'}
                </button>
              ))}
            </div>

            <div className="select-inline">
              <label htmlFor="estado">Estado</label>
              <select id="estado" value={filterEstado} onChange={handleFilterEstado}>
                <option value="todos">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div className="select-inline">
              <label htmlFor="proveedor">Proveedor</label>
              <select
                id="proveedor"
                value={filterProveedor}
                onChange={(e) => {
                  setFilterProveedor(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {proveedoresCat.map((pv) => (
                  <option key={pv.id} value={pv.id}>{pv.nombre}</option>
                ))}
              </select>
            </div>

            {editable && (
            <div className="btn-group">
              <button className="btn secondary" type="button" onClick={() => setMostrarEditar((v) => !v)}>
                {mostrarEditar ? 'Ocultar edición' : 'Editar por código'}
              </button>
            </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {mensaje.texto && <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>{mensaje.texto}</div>}

      {productoPanel && (
        <div className="card">
          <div className="prov-detalle-head">
            <div>
              <p className="muted" style={{ margin: 0 }}>Proveedores de</p>
              <h3 style={{ margin: '2px 0 0' }}>{productoPanel.nombre}</h3>
            </div>
            <button type="button" className="btn ghost" onClick={() => setPanelId(null)}>Cerrar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
            {provsPanel.map((rel) => {
              const mejor = provsPanel.length > 1 && Number(rel.costo_actual) === costoMinimo;
              return (
                <div key={rel.id} className={`prov-producto${mejor ? ' mejor' : ''}`}>
                  <div className="fila">
                    <strong>{rel.proveedor_nombre}</strong>
                    <strong>${Number(rel.costo_actual).toFixed(2)}</strong>
                  </div>
                  {mejor && <span className="mejor-precio">Costo más bajo</span>}
                  <span className="muted small">Código: {rel.codigo_proveedor || '—'}</span>
                  {editable && (
                    <div className="acciones">
                      <button type="button" className="btn peligro sm" onClick={() => quitarProveedor(rel)}>Quitar</button>
                    </div>
                  )}
                </div>
              );
            })}
            {!provsPanel.length && <p className="muted">Este producto no tiene proveedor asignado.</p>}
          </div>
          {editable && (
            <div className="caja-asignar">
              <h3 style={{ marginTop: 0 }}>Agregar proveedor</h3>
              <form className="form grid" onSubmit={agregarProveedor}>
                <label>
                  Proveedor
                  <select value={formProv.proveedor_id} onChange={(e) => setFormProv({ ...formProv, proveedor_id: e.target.value })}>
                    <option value="">Selecciona…</option>
                    {provsDisponibles.map((pv) => (
                      <option key={pv.id} value={pv.id}>{pv.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Código del proveedor
                  <input value={formProv.codigo_proveedor} onChange={(e) => setFormProv({ ...formProv, codigo_proveedor: e.target.value })} />
                </label>
                <label>
                  Costo
                  <input type="number" min="0" step="0.01" value={formProv.costo_actual} onChange={(e) => setFormProv({ ...formProv, costo_actual: e.target.value })} />
                </label>
                <button type="submit" className="btn primary">Agregar</button>
              </form>
            </div>
          )}
        </div>
      )}

      {editable && mostrarEditar && (
        <div className="card form-card">
          <h3>Editar por código de barras</h3>

          <div className="form grid">
            <input
              name="codigo_barras"
              placeholder="Código de barras"
              value={formEdit.codigo_barras}
              onChange={handleEditChange}
            />
            <button className="btn primary" type="button" onClick={buscarParaEditar}>
              Buscar
            </button>
          </div>

          <form className="form grid" onSubmit={handleEditar}>
            <input name="nombre" placeholder="Nombre" value={formEdit.nombre} onChange={handleEditChange} />
            <input
              name="descripcion"
              placeholder="Descripción"
              value={formEdit.descripcion}
              onChange={handleEditChange}
            />
            <select name="estado" value={formEdit.estado} onChange={handleEditChange}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <input name="categoria" placeholder="Categoría" value={formEdit.categoria} onChange={handleEditChange} />
            <input name="marca" placeholder="Marca" value={formEdit.marca} onChange={handleEditChange} />
            <input
              name="presentacion"
              placeholder="Presentación"
              value={formEdit.presentacion}
              onChange={handleEditChange}
            />
            <input name="unidad" placeholder="Unidad" value={formEdit.unidad} onChange={handleEditChange} />
            <input
              name="precio_venta"
              type="number"
              step="0.01"
              placeholder="Precio"
              value={formEdit.precio_venta}
              onChange={handleEditChange}
            />
            <input
              name="costo_promedio"
              type="number"
              step="0.01"
              placeholder="Costo promedio"
              value={formEdit.costo_promedio}
              onChange={handleEditChange}
            />
            <input
              name="stock"
              type="number"
              placeholder="Stock"
              value={formEdit.stock}
              onChange={handleEditChange}
            />
            <input
              name="stock_minimo"
              type="number"
              placeholder="Stock mínimo"
              value={formEdit.stock_minimo}
              onChange={handleEditChange}
            />
            <input
              name="imagen"
              placeholder="Imagen URL (opcional)"
              value={formEdit.imagen}
              onChange={handleEditChange}
            />
            <input type="file" accept="image/*" onChange={(e) => setFileEdit(e.target.files?.[0] || null)} />

            <div className="form-actions">
              <button className="btn primary" type="submit">
                Guardar cambios
              </button>
              <button className="btn ghost" type="button" onClick={resetEditar}>
                Limpiar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="list-header">
          <div>
            <h3>Listado</h3>
            <p className="muted">{loading ? 'Cargando…' : `${total} productos`}</p>
          </div>
        </div>

        {view === 'grid' ? (
          <div className="products-grid">
            {productos.map((p) => (
              <div key={p.id || p.codigo_barras} className="product-card">
                <div className="product-image">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} />
                  ) : (
                    <div className="thumb-placeholder">Sin imagen</div>
                  )}
                </div>

                <div className="product-body">
                  <div className="product-top">
                    <h4 className="product-name">{p.nombre}</h4>
                    <span className="badge">{(p.estado || 'ACTIVO').toUpperCase()}</span>
                  </div>

                  <p className="muted">{p.descripcion || 'Sin descripción'}</p>

                  <div className="product-meta">
                    <span className="pill">{p.marca || 'Sin marca'}</span>
                    <span className={`pill ${p.stock > 0 ? 'pill-ok' : 'pill-warn'}`}>
                      Stock: {p.stock ?? 0}
                    </span>
                  </div>

                  <div className="product-footer">
                    <div className="muted small">Código: {p.codigo_barras || 'N/D'}</div>
                    <div className="muted small">Categoría: {p.categoria || 'N/D'}</div>
                  </div>

                  <div>
                    {(p.proveedores || []).length
                      ? p.proveedores.map((x) => <span key={x.id} className="chip">{x.proveedor_nombre}</span>)
                      : <span className="chip aviso">Sin proveedor</span>}
                  </div>

                  <div className="product-footer">
                    <strong>${Number(p.precio_venta || 0).toFixed(2)}</strong>
                    <button type="button" className="btn secondary sm" onClick={() => setPanelId(p.id)}>Proveedores</button>
                  </div>
                </div>
              </div>
            ))}
            {!productos.length && !loading && <p className="muted">Sin resultados.</p>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Proveedores</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id || p.codigo_barras}>
                    <td>{p.nombre}</td>
                    <td>{p.marca || 'N/D'}</td>
                    <td>{p.codigo_barras || 'N/D'}</td>
                    <td>{p.categoria || 'N/D'}</td>
                    <td>${Number(p.precio_venta || 0).toFixed(2)}</td>
                    <td>{p.stock ?? 0}</td>
                    <td>
                      {(p.proveedores || []).length
                        ? p.proveedores.map((x) => <span key={x.id} className="chip">{x.proveedor_nombre}</span>)
                        : <span className="chip aviso">Sin proveedor</span>}
                    </td>
                    <td>{(p.estado || '').toUpperCase()}</td>
                    <td>
                      <div className="acciones">
                        <button className="btn secondary sm" type="button" onClick={() => setPanelId(p.id)}>
                          Proveedores
                        </button>
                        {editable && (
                          <button className="btn ghost sm" type="button" onClick={() => handleEliminar(p)}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!productos.length && !loading && <p className="muted">Sin resultados.</p>}
          </div>
        )}

        <div className="pagination">
          <button className="btn secondary" disabled={page <= 1} onClick={() => paginar(-1)}>
            Anterior
          </button>
          <span className="info">
            Página {page} de {totalPages} · {total} registros
          </span>
          <button className="btn secondary" disabled={page >= totalPages} onClick={() => paginar(1)}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;