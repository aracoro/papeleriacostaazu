import { useEffect, useMemo, useRef, useState } from 'react';
import logo from '../assets/logo.png';
import { getReporteVentas, getDevoluciones } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ReportsPage() {
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [tipoReporte, setTipoReporte] = useState('general');
  const [ventas, setVentas] = useState([]);
  const [devoluciones, setDevoluciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    setLoading(true);

    const [{ data: reporte }, { data: devolucionesData }] = await Promise.all([
      getReporteVentas(desde, hasta),
      getDevoluciones(),
    ]);

    // Un renglón por recibo (el servidor ya resta lo devuelto de cada venta)
    const recibos = Array.isArray(reporte?.recibos) ? reporte.recibos : [];
    setVentas(recibos);

    // El detalle de devoluciones es solo de los recibos del periodo, para no mezclar
    // devoluciones de ventas de otros periodos ni contar dos veces el mismo recibo
    const folios = new Set(recibos.map((r) => Number(r.id)));
    setDevoluciones(
      Array.isArray(devolucionesData) ? devolucionesData.filter((d) => folios.has(Number(d.venta_id))) : []
    );

    setLoading(false);
  };

  const ventasFiltradas = useMemo(() => {
    let base = ventas;

    if (filtroUsuario.trim()) {
      const lower = filtroUsuario.toLowerCase();
      base = base.filter((v) =>
        String(v.usuario?.nombre || v.usuario_nombre || '').toLowerCase().includes(lower)
      );
    }

    return base;
  }, [ventas, filtroUsuario]);

  const devolucionesFiltradas = useMemo(() => {
    let base = devoluciones;

    if (filtroUsuario.trim()) {
      const lower = filtroUsuario.toLowerCase();
      base = base.filter((d) =>
        String(d.usuario_nombre || '').toLowerCase().includes(lower)
      );
    }

    return base;
  }, [devoluciones, filtroUsuario]);

  // Totales por recibo: cada venta cuenta una sola vez y su devolución se le resta
  const totalVendido = ventasFiltradas.reduce((acc, v) => acc + Number(v.total || 0), 0);
  const totalDevuelto = ventasFiltradas.reduce((acc, v) => acc + Number(v.monto_devuelto || 0), 0);
  const neto = totalVendido - totalDevuelto;
  const totalTransacciones = ventasFiltradas.length;
  const totalDevoluciones = ventasFiltradas.filter((v) => Number(v.monto_devuelto) > 0).length;
  const ticketPromedio = totalTransacciones ? neto / totalTransacciones : 0;
  const ESTADO = { completa: 'Completa', devolucion_parcial: 'Devolución parcial', devuelta: 'Devuelta' };

  const productosDevueltosResumen = useMemo(() => {
    const mapa = {};

    devolucionesFiltradas.forEach((d) => {
      const key = d.producto_nombre || `Producto ${d.producto_id}`;
      if (!mapa[key]) {
        mapa[key] = {
          producto: key,
          cantidad: 0,
          monto: 0,
          motivos: new Set(),
        };
      }

      mapa[key].cantidad += Number(d.cantidad || 0);
      mapa[key].monto += Number(d.monto_devuelto || 0);
      if (d.motivo) mapa[key].motivos.add(d.motivo);
    });

    return Object.values(mapa).map((item) => ({
      ...item,
      motivosTexto: Array.from(item.motivos).join(', '),
    }));
  }, [devolucionesFiltradas]);

  const exportarCSV = () => {
    const encabezadosVentas = ['Folio', 'Fecha', 'Cajero', 'Total', 'Devuelto', 'Neto', 'Estado'];
    const filasVentas = ventasFiltradas.map((v) => [
      v.id,
      String(v.fecha || '').slice(0, 16),
      v.usuario?.nombre || v.usuario_nombre || '',
      Number(v.total || 0).toFixed(2),
      Number(v.monto_devuelto || 0).toFixed(2),
      Number(v.neto ?? v.total ?? 0).toFixed(2),
      ESTADO[v.estado] || '',
    ]);

    const encabezadosDevoluciones = [
      'Folio',
      'Producto',
      'Cantidad',
      'Motivo',
      'Fecha',
      'Usuario',
      'Monto devuelto',
    ];

    const filasDevoluciones = devolucionesFiltradas.map((d) => [
      d.venta_id,
      d.producto_nombre || d.producto_id,
      d.cantidad,
      d.motivo || '',
      String(d.fecha || '').slice(0, 16),
      d.usuario_nombre || '',
      Number(d.monto_devuelto || 0).toFixed(2),
    ]);

    const csvContent = [
      ['REPORTE GENERAL'],
      [],
      ['VENTAS'],
      encabezadosVentas,
      ...filasVentas,
      [],
      ['DEVOLUCIONES'],
      encabezadosDevoluciones,
      ...filasDevoluciones,
    ]
      .map((f) => f.join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
    link.href = url;
    link.download = `reporte_general_${now}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const imprimir = () => {
    window.print();
  };

  return (
    <div className="page report-page">
      <div className="page-header no-print">
        <div>
          <h2>Reportes</h2>
        </div>
      </div>

      <div className="card toolbar report-toolbar no-print">
        <div className="filters">
          <label>
            Fecha inicio
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>

          <label>
            Fecha fin
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>

          <label>
            Tipo de reporte
            <select value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
              <option value="general">General</option>
              <option value="ventas">Ventas</option>
              <option value="devoluciones">Devoluciones</option>
            </select>
          </label>

          <label>
            Usuario (opcional)
            <input
              type="text"
              value={filtroUsuario}
              placeholder="Nombre del usuario"
              onChange={(e) => setFiltroUsuario(e.target.value)}
            />
          </label>

          <div className="actions">
            <button className="btn primary" onClick={cargarDatos} disabled={loading}>
              {loading ? 'Cargando...' : 'Generar'}
            </button>
            <button className="btn secondary" onClick={exportarCSV}>
              Exportar CSV
            </button>
            <button className="btn secondary" onClick={imprimir}>
              Imprimir PDF
            </button>
          </div>
        </div>
      </div>

      <div className="report-wrapper">
        <div className="report-sheet card report-print" ref={reportRef}>
          <div className="report-header large">
            <div className="report-brand">
              <img src={logo} alt="Logo" />
              <div>
                <p className="brand-name">Papelería Costa Azul</p>
                <p className="brand-sub">
                  Reporte de {tipoReporte === 'general' ? 'Ventas y Devoluciones' : tipoReporte}
                </p>
              </div>
            </div>

            <div className="report-meta">
              <h3>Reporte de ventas</h3>
              <p>Periodo: {desde} - {hasta}</p>
              <p>
                Generado por: {user?.nombre || 'N/D'} ({user?.rol || 'N/D'}) · Fecha:{' '}
                {new Date().toLocaleString('es-MX')}
              </p>
            </div>
          </div>

          <div className="report-summary">
            <div className="summary-card">
              <p className="summary-title">Ventas brutas</p>
              <p className="summary-value">${totalVendido.toFixed(2)}</p>
            </div>

            <div className="summary-card">
              <p className="summary-title">Recibos</p>
              <p className="summary-value">{totalTransacciones}</p>
            </div>

            <div className="summary-card">
              <p className="summary-title">Recibos con devolución</p>
              <p className="summary-value">{totalDevoluciones}</p>
            </div>

            <div className="summary-card">
              <p className="summary-title">Devoluciones</p>
              <p className="summary-value">${totalDevuelto.toFixed(2)}</p>
            </div>

            <div className="summary-card">
              <p className="summary-title">Ticket promedio</p>
              <p className="summary-value">${ticketPromedio.toFixed(2)}</p>
            </div>

            <div className="summary-card">
              <p className="summary-title">Ventas netas</p>
              <p className="summary-value">${neto.toFixed(2)}</p>
            </div>
          </div>

          {(tipoReporte === 'general' || tipoReporte === 'ventas') && (
            <>
              <h3 style={{ marginTop: 24 }}>Ventas</h3>
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Cajero</th>
                    <th>Total</th>
                    <th>Devuelto</th>
                    <th>Neto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map((v) => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>{String(v.fecha || '').slice(0, 16)}</td>
                      <td>{v.usuario?.nombre || v.usuario_nombre || 'N/D'}</td>
                      <td>${Number(v.total || 0).toFixed(2)}</td>
                      <td>{Number(v.monto_devuelto) > 0 ? `-$${Number(v.monto_devuelto).toFixed(2)}` : '—'}</td>
                      <td><strong>${Number(v.neto ?? v.total ?? 0).toFixed(2)}</strong></td>
                      <td>{ESTADO[v.estado] || ''}</td>
                    </tr>
                  ))}

                  {!ventasFiltradas.length && (
                    <tr>
                      <td colSpan={7}>Sin ventas en el periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {(tipoReporte === 'general' || tipoReporte === 'devoluciones') && (
            <>
              <h3 style={{ marginTop: 24 }}>Detalle de devoluciones</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Productos devueltos de los recibos de este periodo. Ya están descontados en la columna Neto.
              </p>
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Motivo</th>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Monto devuelto</th>
                  </tr>
                </thead>
                <tbody>
                  {devolucionesFiltradas.map((d) => (
                    <tr key={d.id}>
                      <td>{d.venta_id}</td>
                      <td>{d.producto_nombre || d.producto_id}</td>
                      <td>{d.cantidad}</td>
                      <td>{d.motivo || 'Sin motivo'}</td>
                      <td>{String(d.fecha || '').slice(0, 16)}</td>
                      <td>{d.usuario_nombre || 'N/D'}</td>
                      <td>${Number(d.monto_devuelto || 0).toFixed(2)}</td>
                    </tr>
                  ))}

                  {!devolucionesFiltradas.length && (
                    <tr>
                      <td colSpan={7}>Sin devoluciones en el periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <h3 style={{ marginTop: 24 }}>Productos devueltos</h3>
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad devuelta</th>
                    <th>Monto devuelto</th>
                    <th>Motivos</th>
                  </tr>
                </thead>
                <tbody>
                  {productosDevueltosResumen.map((p) => (
                    <tr key={p.producto}>
                      <td>{p.producto}</td>
                      <td>{p.cantidad}</td>
                      <td>${Number(p.monto || 0).toFixed(2)}</td>
                      <td>{p.motivosTexto || 'Sin motivo'}</td>
                    </tr>
                  ))}

                  {!productosDevueltosResumen.length && (
                    <tr>
                      <td colSpan={4}>Sin productos devueltos en el periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          <div className="report-footer">
            <p>Recibos: {ventasFiltradas.length}</p>
            <p>Recibos con devolución: {totalDevoluciones}</p>
            <p>Monto devuelto: ${totalDevuelto.toFixed(2)}</p>
            <p>Ventas netas del periodo: ${neto.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}