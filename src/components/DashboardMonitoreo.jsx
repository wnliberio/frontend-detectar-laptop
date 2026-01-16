// src/components/DashboardMonitoreo.jsx - VERSIÓN ACTUALIZADA PARA de_clientes_rpa_v2
import React, { useState, useEffect, useMemo } from 'react';
import ModalDetallesMejorado from '/src/components/ModalDetallesMejorado';
import { formatearEstadoConsulta, iniciarDaemon, detenerDaemon, obtenerEstadoDaemon } from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from "react-toastify";


const DashboardMonitoreo = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modalSyncOpen, setModalSyncOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [modalStopOpen, setModalStopOpen] = useState(false);

  // ===== Estado para sincronización manual =====
  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);
  const [syncFechaDesde, setSyncFechaDesde] = useState('');
  const [syncFechaHasta, setSyncFechaHasta] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  // ===== NUEVO: Estado para días faltantes =====
  const [diasFaltantesLoading, setDiasFaltantesLoading] = useState(false);
  const [diasFaltantesData, setDiasFaltantesData] = useState(null);

  
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
        
        toast.success('Consultas iniciadas correctamente');
      
        {/*Simeplemente aqui se actualiza el estado */}
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
  if (daemonState.loading) return;  // no hacer doble click

  try {
    setDaemonState(prev => ({ ...prev, loading: true }));

    const res = await fetch(`${BASE}/daemon/detener`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      toast.success('Daemon detenido correctamente');
      setDaemonState({ running: false, loading: false });
    } else {
      toast.warn(`⚠️ ${data.message}`);
      setDaemonState(prev => ({ ...prev, loading: false }));
    }
  } catch (error) {
    toast.error(`❌ Error deteniendo daemon: ${error.message}`);
    setDaemonState(prev => ({ ...prev, loading: false }));
  }
};

  // ===== Función para ejecutar sincronización manual =====
  const handleEjecutarSincronizacion = async () => {
    // Validar fechas
    if (!syncFechaDesde || !syncFechaHasta) {
      toast.warn('Debe seleccionar ambas fechas');
      return;
    }

    if (syncFechaDesde > syncFechaHasta) {
      toast.warn('La fecha "desde" no puede ser mayor que la fecha "hasta"');
      return;
    }

    try {
      setSyncLoading(true);
      
      const url = `${BASE}/sync/iniciar?fecha_desde=${syncFechaDesde}&fecha_hasta=${syncFechaHasta}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (data.exito) {
        toast.success(
          `✅ Sincronización exitosa: ${data.registros_insertados} nuevos, ${data.registros_duplicados} duplicados`
        );
        // Cerrar dropdown y limpiar fechas
        setSyncDropdownOpen(false);
        setSyncFechaDesde('');
        setSyncFechaHasta('');
        // Limpiar días faltantes
        setDiasFaltantesData(null);
        // Recargar clientes
        cargarClientes();
      } else {
        toast.error(`❌ Error: ${data.mensaje || data.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      toast.error(`❌ Error en sincronización: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // ===== NUEVO: Función para obtener días faltantes =====
  const handleVerDiasFaltantes = async () => {
    // Validar fechas
    if (!syncFechaDesde || !syncFechaHasta) {
      toast.warn('Debe seleccionar ambas fechas para consultar días faltantes');
      return;
    }

    if (syncFechaDesde > syncFechaHasta) {
      toast.warn('La fecha "desde" no puede ser mayor que la fecha "hasta"');
      return;
    }

    try {
      setDiasFaltantesLoading(true);
      setDiasFaltantesData(null);
      
      const url = `${BASE}/sync/dias-faltantes?fecha_desde=${syncFechaDesde}&fecha_hasta=${syncFechaHasta}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setDiasFaltantesData(data);
        if (data.dias_faltantes === 0) {
          toast.success('✅ Todos los días del rango están sincronizados');
        } else {
          toast.info(`⚠️ Se encontraron ${data.dias_faltantes} días sin sincronizar`);
        }
      } else {
        toast.error(`❌ Error: ${data.detail || 'Error consultando días faltantes'}`);
      }
    } catch (error) {
      toast.error(`❌ Error consultando días faltantes: ${error.message}`);
    } finally {
      setDiasFaltantesLoading(false);
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

  // ===== Cerrar dropdown al hacer clic fuera =====
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (syncDropdownOpen && !event.target.closest('.sync-dropdown-container')) {
        setSyncDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [syncDropdownOpen]);

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
      {/*<div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
         Dashboard de Monitoreo
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Vista en tiempo real del procesamiento automático
        </p>
      </div>*/}

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

        {/* ===== Botón de Sincronización con Dropdown ===== */}
        <div className="sync-dropdown-container" style={{ position: 'relative' }}>
          <button
            onClick={() => setSyncDropdownOpen(!syncDropdownOpen)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span>
            SINCRONIZACIÓN
            <span style={{ 
              transform: syncDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>▼</span>
          </button>

          {/* Dropdown Panel */}
          {syncDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              marginTop: '8px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              padding: '16px',
              zIndex: 1000,
              minWidth: '300px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ 
                fontWeight: '600', 
                marginBottom: '12px', 
                color: '#374151',
                fontSize: '14px'
              }}>
                Rango de fechas para sincronizar
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  marginBottom: '4px' 
                }}>
                  Fecha solicitada desde:
                </label>
                <input
                  type="date"
                  value={syncFechaDesde}
                  onChange={(e) => {
                    setSyncFechaDesde(e.target.value);
                    setDiasFaltantesData(null); // Limpiar resultados al cambiar fecha
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  marginBottom: '4px' 
                }}>
                  Fecha solicitada hasta:
                </label>
                <input
                  type="date"
                  value={syncFechaHasta}
                  onChange={(e) => {
                    setSyncFechaHasta(e.target.value);
                    setDiasFaltantesData(null); // Limpiar resultados al cambiar fecha
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Botón Ejecutar Sincronización */}
              <button
                onClick={() => setModalSyncOpen(true)}
                disabled={syncLoading || !syncFechaDesde || !syncFechaHasta}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: syncLoading ? '#9ca3af' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: syncLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}
              >
                {syncLoading ? '⏳ Sincronizando...' : 'EJECUTAR SINCRONIZACIÓN'}
              </button>

              {/* NUEVO: Botón Ver Días Faltantes */}
              <button
                onClick={handleVerDiasFaltantes}
                disabled={diasFaltantesLoading || !syncFechaDesde || !syncFechaHasta}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: diasFaltantesLoading ? '#9ca3af' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: diasFaltantesLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {diasFaltantesLoading ? ' Consultando...' : 'VER DÍAS FALTANTES'}
              </button>

              {/* Mostrar resultado de días faltantes */}
              {diasFaltantesData && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: diasFaltantesData.dias_faltantes > 0 ? '#fef3c7' : '#d1fae5',
                  borderRadius: '6px',
                  border: `1px solid ${diasFaltantesData.dias_faltantes > 0 ? '#f59e0b' : '#10b981'}`
                }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '13px',
                    color: diasFaltantesData.dias_faltantes > 0 ? '#92400e' : '#065f46',
                    marginBottom: '8px'
                  }}>
                    {diasFaltantesData.dias_faltantes > 0 
                      ? `⚠️ ${diasFaltantesData.dias_faltantes} días sin sincronizar`
                      : '✅ Todos los días están sincronizados'
                    }
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    Rango: {diasFaltantesData.total_dias_rango} días | 
                    Sincronizados: {diasFaltantesData.dias_sincronizados}
                  </div>

                  {/* Lista de días faltantes */}
                  {diasFaltantesData.dias_faltantes > 0 && diasFaltantesData.lista_dias_faltantes && (
                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      fontSize: '12px',
                      color: '#374151'
                    }}>
                      {diasFaltantesData.lista_dias_faltantes.map((dia, index) => (
                        <div key={index} style={{
                          padding: '4px 8px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          border: '1px solid #e5e7eb'
                        }}>
                          📅 {dia}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ 
                marginTop: '12px', 
                fontSize: '11px', 
                color: '#9ca3af',
                textAlign: 'center'
              }}>
                Los registros duplicados se ignorarán automáticamente
              </div>
            </div>
          )}
        </div>

        {/* <button
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
         REFRESCAR
        </button>*/}

        {/* Daemon Controls */}
        {daemonState.running ? (
          <button
            onClick={() => setModalStopOpen(true)}  // ← abre modal en vez de ejecutar
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
           DETENER CONSULTA
          </button>
        ) : (
          <button
            onClick={() => setModalConfirmOpen(true)}
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
             INICIAR CONSULTA
          </button>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: daemonState.running ? '#b2d1faff' : '#f5b1b1ff',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: daemonState.running ? '#0e8d62ff' : '#ef4444'
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
          <thead style={{ backgroundColor: '#4b6392ff', borderBottom: '1px solid #e5e7eb' }}>
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
            {/*{loading && (
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
            )}*/}
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
      {/* Modal para INICIAR daemon */}
      <ConfirmModal
        open={modalConfirmOpen}
        loading={daemonState.loading}
        onCancel={() => setModalConfirmOpen(false)}
        onConfirm={() => {
          setModalConfirmOpen(false);
          handleIniciarDaemon();
        }}
        title="Confirmación"
        mainMessage="¿Está seguro de Iniciar las Consultas?"
        subMessage="Se procesa una consulta por solicitud cada 30 minutos y solo para solicitudes en estado Trámite."
        confirmText="Sí, Iniciar"
      />

      {/* Modal para DETENER daemon */}
      <ConfirmModal
        open={modalStopOpen}
        loading={daemonState.loading}
        onCancel={() => setModalStopOpen(false)}
        onConfirm={() => {
          setModalStopOpen(false);
          handleDetenerDaemon();
        }}
        title="Confirmación"
        mainMessage="¿Está seguro de detener las consultas?"
        subMessage="Se finalizará y se detendrá completamente."
        confirmText="Sí, Detener"
      />
      {/* Modal para EJECUTAR SINCRONIZACIÓN */}
      <ConfirmModal
        open={modalSyncOpen}
        loading={syncLoading}
        onCancel={() => setModalSyncOpen(false)}
        onConfirm={() => {
          setModalSyncOpen(false);
          handleEjecutarSincronizacion();
        }}
        title="Confirmación"
        mainMessage="¿Está seguro de ejecutar la sincronización?"
        subMessage={`Se sincronizarán los registros del ${syncFechaDesde || '---'} al ${syncFechaHasta || '---'}. Los duplicados se ignorarán automáticamente.`}
        confirmText="Sí, Sincronizar"
      />


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