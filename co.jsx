// src/components/DashboardMonitoreo.jsx - VERSIÓN ACTUALIZADA PARA de_clientes_rpa_v2
import React, { useState, useEffect, useMemo } from 'react';
import ModalDetallesMejorado from './ModalDetallesMejorado';
import { formatearEstadoConsulta, iniciarDaemon, detenerDaemon, obtenerEstadoDaemon } from '../lib/api';

const DashboardMonitoreo = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Estado del daemon
  const [daemonState, setDaemonState] = useState({
    running: false,
    loading: false
  });

  const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

  // ===== CALCULAR ESTADÍSTICAS =====
  const estadisticas = useMemo(() => {
    const total = clientes.length;
    const pendientes = clientes.filter(c => c.ESTADO_CONSULTA === 'Pendiente').length;
    const procesando = clientes.filter(c => c.ESTADO_CONSULTA === 'En_Proceso').length;
    const procesados = clientes.filter(c => c.ESTADO_CONSULTA === 'Procesado').length;
    const errores = clientes.filter(c => c.ESTADO_CONSULTA === 'Error').length;
    
    return { total, pendientes, procesando, procesados, errores };
  }, [clientes]);

  // ===== FUNCIONES DE DAEMON =====
  
  const obtenerEstadoDaemonActual = async () => {
    try {
      const res = await fetch(`${BASE}/daemon/estado`);
      if (res.ok) {
        const data = await res.json();
        setDaemonState(prev => ({ ...prev, running: data.running }));
      }
    } catch (error) {
      console.error('Error obteniendo estado daemon:', error);
    }
  };

  const handleIniciarDaemon = async () => {
    if (daemonState.loading) return;
    
    try {
      setDaemonState(prev => ({ ...prev, loading: true }));
      const res = await fetch(`${BASE}/daemon/iniciar`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Daemon iniciado correctamente\nEl sistema procesará automáticamente clientes pendientes cada 30 minutos.');
        setDaemonState({ running: true, loading: false });
      } else {
        alert(`⚠️ ${data.message}`);
        setDaemonState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      alert(`❌ Error iniciando daemon: ${error.message}`);
      setDaemonState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDetenerDaemon = async () => {
    if (daemonState.loading) return;
    
    if (!confirm('¿Detener el procesamiento automático?\n\nEl daemon terminará el cliente actual y se detendrá.')) {
      return;
    }
    
    try {
      setDaemonState(prev => ({ ...prev, loading: true }));
      const res = await fetch(`${BASE}/daemon/detener`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Daemon detenido correctamente');
        setDaemonState({ running: false, loading: false });
      } else {
        alert(`⚠️ ${data.message}`);
        setDaemonState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      alert(`❌ Error deteniendo daemon: ${error.message}`);
      setDaemonState(prev => ({ ...prev, loading: false }));
    }
  };

  // ===== CARGAR CLIENTES =====
  
  const cargarClientes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Filtro por ESTADO_CONSULTA
      if (filtroEstado !== 'Todos') {
        params.append('estado', filtroEstado);
      }
      
      // Búsqueda por nombre, apellido, CI
      if (busqueda) {
        params.append('q', busqueda);
      }
      
      const url = `${BASE}/tracking/clientes${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalles = (cliente) => {
    setClienteSeleccionado(cliente);
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setClienteSeleccionado(null);
    cargarClientes();
  };

  // ===== EFECTOS =====
  
  useEffect(() => {
    cargarClientes();
    obtenerEstadoDaemonActual();
    
    // Polling cada 5 segundos
    const interval = setInterval(() => {
      cargarClientes();
      obtenerEstadoDaemonActual();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [filtroEstado, busqueda]);

  // ===== HELPERS =====
  
  const getEstadoColor = (estado) => {
    const formato = formatearEstadoConsulta(estado);
    return formato.color;
  };

  const getEstadoIcono = (estado) => {
    const formato = formatearEstadoConsulta(estado);
    return formato.icono;
  };

  const getEstadoTexto = (estado) => {
    const formato = formatearEstadoConsulta(estado);
    return formato.texto;
  };

  // ===== RENDER =====
  
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
          📊 Dashboard de Monitoreo
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Vista en tiempo real del procesamiento automático
        </p>
      </div>

      {/* Estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard label="TOTAL" valor={estadisticas.total} color="#6b7280" />
        <StatCard label="PENDIENTES" valor={estadisticas.pendientes} color="#f59e0b" />
        <StatCard label="PROCESANDO" valor={estadisticas.procesando} color="#3b82f6" />
        <StatCard label="PROCESADOS" valor={estadisticas.procesados} color="#10b981" />
        <StatCard label="ERRORES" valor={estadisticas.errores} color="#ef4444" />
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        alignItems: 'center',
        flexWrap: 'wrap',
        backgroundColor: '#f9fafb',
        padding: '16px',
        borderRadius: '8px'
      }}>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            fontSize: '14px'
          }}
        >
          <option>Todos</option>
          <option>Pendiente</option>
          <option>En_Proceso</option>
          <option>Procesado</option>
          <option>Error</option>
        </select>

        <input
          type="text"
          placeholder="Buscar por nombre, apellido, CI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            flex: 1,
            minWidth: '200px'
          }}
        />

        <button
          onClick={cargarClientes}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔄 Refrescar
        </button>

        {/* Daemon Controls */}
        {daemonState.running ? (
          <button
            onClick={handleDetenerDaemon}
            disabled={daemonState.loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ⏹️  DETENER CONSULTA
          </button>
        ) : (
          <button
            onClick={handleIniciarDaemon}
            disabled={daemonState.loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ▶️  INICIAR CONSULTA
          </button>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: daemonState.running ? '#dbeafe' : '#fee2e2',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: daemonState.running ? '#10b981' : '#ef4444'
          }}></span>
          {daemonState.running ? 'CONSULTA ACTIVA' : 'CONSULTA INACTIVA'}
        </div>
      </div>

      {/* Tabla de clientes */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}>
          <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>NOMBRES</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>CI</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>AGENCIA</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>ESTADO</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && clientes.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                  No hay clientes para mostrar
                </td>
              </tr>
            )}
            {clientes.map((cliente, index) => (
              <tr key={cliente.id} style={{
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                fontSize: '13px'
              }}>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontWeight: '500' }}>{cliente.ID_SOLICITUD || cliente.id}</span>
                </td>
                <td style={{ padding: '12px' }}>
                  {cliente.NOMBRES_CLIENTE} {cliente.APELLIDOS_CLIENTE}
                </td>
                <td style={{ padding: '12px' }}>
                  {cliente.CEDULA}
                </td>
                <td style={{ padding: '12px' }}>
                  {cliente.AGENCIA}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    color: getEstadoColor(cliente.ESTADO_CONSULTA)
                  }}>
                    {getEstadoIcono(cliente.ESTADO_CONSULTA)}
                    {getEstadoTexto(cliente.ESTADO_CONSULTA)}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => abrirDetalles(cliente)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de detalles */}
      {modalVisible && (
        <ModalDetallesMejorado
          cliente={clienteSeleccionado}
          isVisible={modalVisible}
          onClose={cerrarModal}
        />
      )}
    </div>
  );
};

// Componente estatísticas
function StatCard({ label, valor, color }) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: color, marginBottom: '4px' }}>
        {valor}
      </div>
      <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: '500' }}>
        {label}
      </div>
    </div>
  );
}

export default DashboardMonitoreo;