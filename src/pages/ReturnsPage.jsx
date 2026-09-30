import { useEffect, useState } from 'react';
import {
  registrarDevolucion,
  getVentaDetalle,
  getDevolucionesPorVenta,
  getDevoluciones,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { puedeEscribir } from '../roles';

const motivosBase = [
  'Dañado',
  'No era el producto que quería el cliente',
  'Defecto de fábrica',
  'Producto incompleto',
  'Error en la venta',
  'Otro',
];

export default function ReturnsPage() {
  const { user } = useAuth();
  const editable = puedeEscribir(user);
  const [folio, setFolio] = useState('');
  const [lineas, setLineas] = useState([]);
  const [ventaInfo, setVentaInfo] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [devoluciones, setDevoluciones] = useState([]);

  useEffect(() => {
    cargarDevolucionesRecientes();
  }, []);

  const cargarDevolucionesRecientes = async () => {
    const { data, error } = await getDevoluciones();

    if (error) {
      setDevoluciones([]);
      return;
    }

    setDevoluciones(data || []);
  };

  const cargarFolio = async () => {
    setMensaje({ tipo: '', texto: '' });
    setVentaInfo(null);
    setLineas([]);

    if (!folio.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un folio' });
      return;
    }

    setLoading(true);

    // Venta y devoluciones previas se piden al mismo tiempo
    const [{ data, error }, { data: devolucionesVenta, error: errorDev }] = await Promise.all([
      getVentaDetalle(folio.trim()),
      getDevolucionesPorVenta(folio.trim()),
    ]);

    if (error || !data?.venta) {
      setLoading(false);
      const texto = /no encontrada|inválido/i.test(error?.message || '') || !error
        ? 'No se encontró el folio'
        : error.message;
      setMensaje({ tipo: 'error', texto });
      return;
    }

    if (errorDev) {
      setLoading(false);
      setMensaje({
        tipo: 'error',
        texto: errorDev.message || 'No se pudieron cargar las devoluciones',
      });
      return;
    }

    const resumenDev = {};

    (devolucionesVenta || []).forEach((d) => {
      if (!resumenDev[d.producto_id]) {
        resumenDev[d.producto_id] = {
          cantidad: 0,
          motivo: d.motivo || '',
        };
      }

      resumenDev[d.producto_id].cantidad += Number(d.cantidad || 0);

      if (!resumenDev[d.producto_id].motivo && d.motivo) {
        resumenDev[d.producto_id].motivo = d.motivo;
      }
    });

    const detalle = (data.detalle || []).map((d) => {
      const ya = resumenDev[d.producto_id] || { cantidad: 0, motivo: '' };
      const disponible = Number(d.cantidad || 0) - Number(ya.cantidad || 0);

      return {
        producto_id: d.producto_id,
        producto: d.producto,
        cantidadVendida: Number(d.cantidad || 0),
        cantidadDevuelta: Number(ya.cantidad || 0),
        cantidadDevolver: disponible > 0 ? 1 : 0,
        precio: Number(d.precio ?? d.precio_unitario ?? 0),
        motivo: ya.motivo || '',
        motivoNuevo: '',
        estado: disponible <= 0 ? 'devuelto' : 'pendiente',
      };
    });

    setVentaInfo(data.venta);
    setLineas(detalle);
    setLoading(false);
  };

  const actualizarCantidadLinea = (productoId, valor) => {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.producto_id !== productoId) return l;

        const disponible = l.cantidadVendida - l.cantidadDevuelta;
        const nueva = Math.max(0, Math.min(Number(valor) || 0, disponible));

        return { ...l, cantidadDevolver: nueva };
      })
    );
  };

  const actualizarMotivoLinea = (productoId, valor) => {
    setLineas((prev) =>
      prev.map((l) =>
        l.producto_id === productoId ? { ...l, motivoNuevo: valueOrEmpty(valor) } : l
      )
    );
  };

  const valueOrEmpty = (v) => (v == null ? '' : String(v));

  const devolverProducto = async (linea) => {
    setMensaje({ tipo: '', texto: '' });

    if (!ventaInfo?.id) {
      setMensaje({ tipo: 'error', texto: 'Primero carga un folio válido' });
      return;
    }

    if (!user?.id) {
      setMensaje({ tipo: 'error', texto: 'No se encontró el usuario de la sesión' });
      return;
    }

    if (linea.estado === 'devuelto') {
      setMensaje({ tipo: 'error', texto: 'Ese producto ya fue devuelto' });
      return;
    }

    if (!linea.motivoNuevo.trim()) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un motivo antes de devolver' });
      return;
    }

    if (Number(linea.cantidadDevolver || 0) <= 0) {
      setMensaje({ tipo: 'error', texto: 'Indica una cantidad válida a devolver' });
      return;
    }

    setLoading(true);

    const { error } = await registrarDevolucion({
      venta_id: ventaInfo.id,
      items: [
        {
          producto_id: linea.producto_id,
          cantidad: linea.cantidadDevolver,
          precio: linea.precio,
          motivo: linea.motivoNuevo.trim(),
        },
      ],
    });

    setLoading(false);

    if (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo registrar la devolución',
      });
      return;
    }

    setMensaje({ tipo: 'success', texto: 'Producto devuelto correctamente' });
    await cargarFolio();
    await cargarDevolucionesRecientes();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>
            Devoluciones
            {!editable && <span className="solo-lectura">Solo lectura</span>}
          </h2>
        </div>

        {mensaje.texto && (
          <div className={`alert ${mensaje.tipo === 'error' ? 'error' : 'success'}`}>
            {mensaje.texto}
          </div>
        )}
      </div>

      {editable && (
      <div className="card">
        <div className="input-row">
          <input
            type="number"
            placeholder="Folio del ticket"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
          />

          <button
            className="btn secondary"
            type="button"
            onClick={cargarFolio}
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Cargar folio'}
          </button>
        </div>

        {ventaInfo && (
          <div
            className="card"
            style={{ background: 'rgba(0,178,255,0.06)', marginTop: 16 }}
          >
            <p className="muted">
              Folio {ventaInfo.id} · Fecha{' '}
              {new Date(ventaInfo.fecha).toLocaleString('es-MX')} · Cajero:{' '}
              {ventaInfo.usuario?.nombre || 'N/D'}
            </p>
          </div>
        )}

        {lineas.length > 0 && (
          <div className="table-wrapper" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Vendida</th>
                  <th>Devuelta</th>
                  <th>Disponible</th>
                  <th>Cantidad</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => {
                  const disponible = l.cantidadVendida - l.cantidadDevuelta;

                  return (
                    <tr key={l.producto_id}>
                      <td>{l.producto?.nombre || l.producto_id}</td>
                      <td>{l.cantidadVendida}</td>
                      <td>{l.cantidadDevuelta}</td>
                      <td>{disponible}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={disponible}
                          value={l.cantidadDevolver}
                          disabled={l.estado === 'devuelto'}
                          onChange={(e) =>
                            actualizarCantidadLinea(l.producto_id, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        {l.estado === 'devuelto' ? (
                          <span>{l.motivo || 'Sin motivo'}</span>
                        ) : (
                          <select
                            value={l.motivoNuevo}
                            onChange={(e) =>
                              actualizarMotivoLinea(l.producto_id, e.target.value)
                            }
                          >
                            <option value="">Selecciona motivo</option>
                            {motivosBase.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {l.estado === 'devuelto' ? (
                          <span className="badge">Devuelto</span>
                        ) : (
                          <span className="badge">Pendiente</span>
                        )}
                      </td>
                      <td>
                        {l.estado === 'devuelto' ? (
                          <button className="btn ghost" type="button" disabled>
                            Devuelto
                          </button>
                        ) : (
                          <button
                            className="btn primary"
                            type="button"
                            onClick={() => devolverProducto(l)}
                            disabled={loading}
                          >
                            Devolver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      )}

      <div className="card table-wrapper">
        <h3>Devoluciones recientes</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Producto</th>
              <th>Motivo</th>
              <th>Fecha</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {devoluciones.map((d) => (
              <tr key={d.id}>
                <td>{d.venta_id}</td>
                <td>{d.producto_nombre || d.producto_id}</td>
                <td>{d.motivo || 'Sin motivo'}</td>
                <td>{d.fecha ? new Date(String(d.fecha).replace(' ', 'T')).toLocaleString('es-MX') : ''}</td>
                <td>{d.usuario_nombre || 'N/D'}</td>
              </tr>
            ))}

            {!devoluciones.length && (
              <tr>
                <td colSpan={5}>Sin devoluciones recientes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}