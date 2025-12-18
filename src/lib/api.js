// src/lib/api.js - VERSIÓN ACTUALIZADA PARA de_clientes_rpa_v2
/**
 * API calls para el sistema de consultas Función Judicial
 * Actualizado para usar de_clientes_rpa_v2 con ESTADO_CONSULTA
 */

const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

// ===== ENDPOINTS DE CLIENTES =====

/**
 * Obtiene lista de clientes con filtros
 * Retorna clientes de de_clientes_rpa_v2
 */
export async function getClientes(filtros = {}) {
  try {
    const params = new URLSearchParams();
    
    // Filtro de estado - ahora es ESTADO_CONSULTA
    if (filtros.estado && filtros.estado !== 'Todos') {
      params.append('estado', filtros.estado);
    }
    
    // Búsqueda
    if (filtros.q) {
      params.append('q', filtros.q);
    }
    
    // Rango de fechas
    if (filtros.fecha_desde) {
      params.append('fecha_desde', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      params.append('fecha_hasta', filtros.fecha_hasta);
    }
    
    const url = `/tracking/clientes${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(`${BASE}${url}`);
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error en getClientes:', error);
    throw error;
  }
}

/**
 * Obtiene clientes con tracking completo (incluyendo procesos activos)
 */
export async function getClientesConTracking(filtros = {}) {
  try {
    const clientes = await getClientes(filtros);
    
    // Los clientes ya vienen con toda la información de de_clientes_rpa_v2
    // Incluyendo: ID_SOLICITUD, ESTADO, AGENCIA, CEDULA, NOMBRES_CLIENTE, APELLIDOS_CLIENTE, ESTADO_CONSULTA
    
    return clientes;
  } catch (error) {
    console.error('Error en getClientesConTracking:', error);
    throw error;
  }
}

/**
 * Actualiza el estado (ESTADO_CONSULTA) de un cliente
 */
export async function updateClienteEstado(clienteId, nuevoEstado, mensajeError = null) {
  try {
    const res = await fetch(`${BASE}/tracking/clientes/${clienteId}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estado: nuevoEstado,
        mensaje_error: mensajeError
      })
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error actualizando estado:', error);
    throw error;
  }
}

// ===== ENDPOINTS DE PÁGINAS =====

export async function getPaginasDisponibles() {
  try {
    const res = await fetch(`${BASE}/tracking/paginas`);
    if (!res.ok) throw new Error('Error obteniendo páginas');
    return await res.json();
  } catch (error) {
    console.error('Error en getPaginasDisponibles:', error);
    return [];
  }
}

// ===== ENDPOINTS DE PROCESOS =====

/**
 * Crea un proceso completo de consulta para un cliente
 */
export async function crearProcesoConPaginas(clienteId, paginasCodigos, opciones = {}) {
  try {
    const res = await fetch(`${BASE}/tracking/procesos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cliente_id: clienteId,
        paginas_codigos: paginasCodigos,
        headless: opciones.headless ?? false,
        generate_report: opciones.generateReport ?? true
      })
    });
    
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error creando proceso:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un proceso específico
 */
export async function obtenerDetallesProceso(procesoId) {
  try {
    const res = await fetch(`${BASE}/tracking/procesos/${procesoId}`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error obteniendo detalles del proceso:', error);
    throw error;
  }
}

// ===== ENDPOINTS DE DAEMON =====

export async function iniciarDaemon() {
  try {
    const res = await fetch(`${BASE}/daemon/iniciar`, { method: 'POST' });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error iniciando daemon:', error);
    throw error;
  }
}

export async function detenerDaemon() {
  try {
    const res = await fetch(`${BASE}/daemon/detener`, { method: 'POST' });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error deteniendo daemon:', error);
    throw error;
  }
}

export async function obtenerEstadoDaemon() {
  try {
    const res = await fetch(`${BASE}/daemon/estado`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error obteniendo estado del daemon:', error);
    return { running: false };
  }
}

// ===== UTILIDADES =====

/**
 * Formatea estados para mostrar en UI
 */
export function formatearEstadoConsulta(estado) {
  const formatos = {
    'Pendiente': { texto: 'Pendiente', color: '#f59e0b', icono: '⏳' },
    'En_Proceso': { texto: 'En Proceso', color: '#3b82f6', icono: '🔄' },
    'En_Procesando': { texto: 'En Proceso', color: '#3b82f6', icono: '🔄' }, // Alias
    'Procesando': { texto: 'En Proceso', color: '#3b82f6', icono: '🔄' }, // Alias legacy
    'Procesado': { texto: 'Procesado', color: '#10b981', icono: '✅' },
    'Error': { texto: 'Error', color: '#ef4444', icono: '❌' }
  };
  
  return formatos[estado] || { texto: estado, color: '#6b7280', icono: '❓' };
}

/**
 * Configuración de páginas disponibles para consulta
 */
export const TIPOS_PAGINA = {
  interpol: {
    nombre: 'INTERPOL',
    requiere: ['Nombres', 'CI'],
    descripcion: 'Búsqueda en INTERPOL'
  },
  supercias_persona: {
    nombre: 'SUPERCIAS Persona',
    requiere: ['CI'],
    descripcion: 'Búsqueda de antecedentes en SUPERCIAS'
  },
  ruc: {
    nombre: 'SRI RUC',
    requiere: ['RUC'],
    descripcion: 'Búsqueda de RUC en SRI'
  },
  google: {
    nombre: 'Google',
    requiere: ['Nombres'],
    descripcion: 'Búsqueda en Google'
  },
  contraloria: {
    nombre: 'Contraloría',
    requiere: ['Nombres'],
    descripcion: 'Búsqueda en Contraloría'
  },
  mercado_valores: {
    nombre: 'Mercado de Valores',
    requiere: ['Nombres'],
    descripcion: 'Búsqueda en Mercado de Valores'
  },
  denuncias: {
    nombre: 'Denuncias',
    requiere: ['Nombres'],
    descripcion: 'Búsqueda de denuncias'
  },
  deudas: {
    nombre: 'Deudas',
    requiere: ['CI', 'Nombres'],
    descripcion: 'Búsqueda de deudas'
  },
  predio_quito: {
    nombre: 'Predios Quito',
    requiere: ['CI'],
    descripcion: 'Búsqueda de predios en Quito'
  },
  predio_manta: {
    nombre: 'Predios Manta',
    requiere: ['CI'],
    descripcion: 'Búsqueda de predios en Manta'
  }
};

// Alias para compatibilidad
export { formatearEstadoConsulta as formatearEstadoProceso };