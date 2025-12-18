// src/components/ModalDetallesMejorado.jsx - VERSION ARREGLADA FUNCIONANDO
import React, { useState, useEffect } from 'react';
import { formatearEstadoConsulta } from '../lib/api.js';

const ModalDetallesMejorado = ({ 
  cliente, 
  isVisible, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detallesProceso, setDetallesProceso] = useState(null);
  const [reportesDisponibles, setReportesDisponibles] = useState([]);

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'N/A';
    return new Date(fechaISO).toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (isVisible && cliente) {
      console.log('🔍 DEBUG - Cliente completo:', cliente);
      console.log('🔍 DEBUG - Proceso activo:', cliente.proceso_activo);
      console.log('🔍 DEBUG - Cliente estado:', cliente.estado);
      console.log('🔍 DEBUG - Proceso ID:', cliente.proceso_activo?.proceso_id);
      console.log('🔍 DEBUG - Job ID:', cliente.proceso_activo?.job_id);
      console.log('🔍 DEBUG - Consultas en proceso:', cliente.proceso_activo?.consultas);
      console.log('🔍 DEBUG - Paginas consultadas:', cliente.proceso_activo?.paginas_consultadas);
      console.log('🔍 DEBUG - Detalles consultas:', cliente.proceso_activo?.detalles_consultas);
      
      if (cliente.proceso_activo) {
        cargarDetallesProceso();
        // COMENTAMOS LA CARGA DE REPORTES POR EL ERROR DEL BACKEND
        // cargarReportesCliente();
      }
    }
  }, [isVisible, cliente]);

  const cargarDetallesProceso = async () => {
    if (!cliente?.proceso_activo) return;

    try {
      setLoading(true);
      setDetallesProceso(cliente.proceso_activo);
      setError(null);
    } catch (err) {
      console.error('Error cargando detalles del proceso:', err);
      setError('Error cargando detalles del proceso');
    } finally {
      setLoading(false);
    }
  };

  const cargarReportesCliente = async () => {
    if (!cliente?.id) return;

    try {
      const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";
      const base = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
      
      const response = await fetch(`${base}/tracking/clientes/${cliente.id}/reportes`);
      if (response.ok) {
        const reportes = await response.json();
        setReportesDisponibles(reportes);
      }
    } catch (err) {
      console.error('Error cargando reportes:', err);
      // No es crítico, continuamos sin reportes
    }
  };

  const descargarReporte = async (procesoId) => {
    try {
      setLoading(true);
      
      const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";
      const base = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
      
      const response = await fetch(`${base}/tracking/reportes/${procesoId}/download`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo descargar el reporte`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'reporte.docx';
      if (disposition) {
        const filenameMatch = disposition.match(/filename="?(.+)"?/);
        if (filenameMatch) filename = filenameMatch[1];
      } else {
        const fecha = new Date().toISOString().split('T')[0];
        filename = `reporte_${cliente.apellido}_${cliente.nombre}_${fecha}.docx`;
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Descarga iniciada:', filename);
      
    } catch (err) {
      console.error('❌ Error descargando reporte:', err);
      setError(`Error descargando reporte: ${err.message}`);
      alert(`Error descargando reporte: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función principal para obtener resumen
  const obtenerResumenPaginas = () => {
    console.log('🔍 DEBUG - Obteniendo resumen de páginas...');
    
    const proceso = cliente?.proceso_activo;
    if (!proceso) {
      console.log('❌ No hay proceso activo');
      return { totalSolicitadas: 0, exitosas: 0, fallidas: 0, porcentajeExito: 0 };
    }

    // OPCIÓN 1: Usar campos directos de BD
    if (typeof proceso.total_paginas_solicitadas === 'number') {
      const totalSolicitadas = proceso.total_paginas_solicitadas || 0;
      const exitosas = proceso.total_paginas_exitosas || 0;
      const fallidas = proceso.total_paginas_fallidas || 0;
      
      const resultado = {
        totalSolicitadas,
        exitosas,
        fallidas,
        porcentajeExito: totalSolicitadas > 0 ? Math.round((exitosas / totalSolicitadas) * 100) : 0
      };
      
      console.log('✅ Resumen obtenido de campos directos BD:', resultado);
      return resultado;
    }

    // OPCIÓN 2: Calcular desde array de consultas
    let consultas = [];
    
    if (proceso.consultas && Array.isArray(proceso.consultas)) {
      consultas = proceso.consultas;
      console.log('✅ Consultas encontradas en proceso.consultas:', consultas.length);
    } else if (proceso.paginas_consultadas && Array.isArray(proceso.paginas_consultadas)) {
      consultas = proceso.paginas_consultadas;
      console.log('✅ Consultas encontradas en proceso.paginas_consultadas:', consultas.length);
    }

    if (consultas.length === 0) {
      console.log('⚠️ Array de consultas vacío, retornando zeros');
      return { totalSolicitadas: 0, exitosas: 0, fallidas: 0, porcentajeExito: 0 };
    }

    const totalSolicitadas = consultas.length;
    const exitosas = consultas.filter(c => {
      const estadosExitosos = ['Exitosa', 'Completado', 'SUCCESS', 'COMPLETED'];
      return estadosExitosos.includes(c.estado) && c.screenshot_path;
    }).length;
    
    const fallidas = consultas.filter(c => {
      const estadosFallidos = ['Fallida', 'Error', 'FAILED', 'ERROR'];
      return estadosFallidos.includes(c.estado) || !c.screenshot_path;
    }).length;
    
    const resultado = {
      totalSolicitadas,
      exitosas,
      fallidas,
      porcentajeExito: totalSolicitadas > 0 ? Math.round((exitosas / totalSolicitadas) * 100) : 0
    };

    console.log('✅ Resumen calculado desde array:', resultado);
    return resultado;
  };

  // Obtener páginas que fallaron específicamente - CON DEBUG
  const obtenerPaginasFallidas = () => {
    console.log('🔍 DEBUG - Obteniendo páginas fallidas...');
    
    const proceso = cliente?.proceso_activo;
    if (!proceso) {
      console.log('❌ No hay proceso activo');
      return [];
    }

    let consultas = [];
    
    if (proceso.consultas && Array.isArray(proceso.consultas)) {
      consultas = proceso.consultas;
      console.log('✅ Consultas encontradas en proceso.consultas:', consultas.length);
    } else if (proceso.paginas_consultadas && Array.isArray(proceso.paginas_consultadas)) {
      consultas = proceso.paginas_consultadas;
      console.log('✅ Consultas encontradas en proceso.paginas_consultadas:', consultas.length);
    }

    console.log('📋 Consultas a analizar:', consultas);

    if (consultas.length === 0) {
      console.log('⚠️ No hay consultas para analizar');
      return [];
    }

    const fallidas = consultas.filter(c => {
      const estadosFallidos = ['Fallida', 'Error', 'FAILED', 'ERROR'];
      const tieneEstadoFallido = estadosFallidos.includes(c.estado);
      const noTieneScreenshot = !c.screenshot_path || c.screenshot_path.trim() === '';
      
      console.log(`📄 Analizando consulta:`, {
        codigo: c.pagina_codigo || c.pagina_id || c.codigo,
        estado: c.estado,
        tieneEstadoFallido,
        screenshot_path: c.screenshot_path,
        noTieneScreenshot,
        esFallida: tieneEstadoFallido || noTieneScreenshot
      });
      
      return tieneEstadoFallido || noTieneScreenshot;
    }).map(c => ({
      codigo: c.pagina_codigo || c.pagina_id || c.codigo || 'Página desconocida',
      url: c.url || 'URL no disponible',
      mensaje: c.mensaje_error || c.error || 'Sin screenshot capturado',
      estado: c.estado
    }));

    console.log('✅ Páginas fallidas encontradas:', fallidas.length);
    console.log('📋 Detalle páginas fallidas:', fallidas);
    
    return fallidas;
  };

  const resumenPaginas = obtenerResumenPaginas();
  const paginasFallidas = obtenerPaginasFallidas();
  const procesoEstaCompletado = cliente?.estado === 'Procesado';
  const hayPaginasFallidas = paginasFallidas.length > 0;

  if (!isVisible || !cliente) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header con botón de descarga */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Detalles del Cliente
            </h2>
            <p className="text-blue-100 mt-1">
              {cliente.nombre} {cliente.apellido}
              {cliente.ruc && ` - RUC: ${cliente.ruc}`}
              {cliente.ci && ` - CI: ${cliente.ci}`}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-3xl font-light transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Error general */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="text-red-700">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Información básica del cliente */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Información del Cliente</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <p className="mt-1 text-sm text-gray-900 font-medium">{cliente.nombre} {cliente.apellido}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cédula</label>
                <p className="mt-1 text-sm text-gray-900">{cliente.ci || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">RUC</label>
                <p className="mt-1 text-sm text-gray-900">{cliente.ruc || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <p className="mt-1 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    cliente.estado === 'Procesado' ? 'bg-green-100 text-green-800' :
                    cliente.estado === 'Procesando' ? 'bg-blue-100 text-blue-800' :
                    cliente.estado === 'Error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cliente.estado}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Proceso activo */}
          {cliente.proceso_activo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900">Proceso Activo</h3>
                <div className="text-xs text-blue-600 font-mono bg-blue-100 px-2 py-1 rounded">
                  ID: {cliente.proceso_activo.proceso_id || cliente.proceso_activo.id}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-blue-700">Job ID</label>
                  <p className="mt-1 text-sm text-blue-900 font-mono">{cliente.proceso_activo.job_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700">Estado del Proceso</label>
                  <p className="mt-1 text-sm text-blue-900">{cliente.proceso_activo.estado || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700">Creado</label>
                  <p className="mt-1 text-sm text-blue-900">{formatearFecha(cliente.proceso_activo.fecha_creacion)}</p>
                </div>
              </div>

              {/* Resumen de páginas consultadas - 4 TARJETAS */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="text-md font-semibold text-blue-800 mb-3">Resumen de Páginas Consultadas</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Total */}
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-900">{resumenPaginas.totalSolicitadas}</div>
                    <div className="text-xs text-gray-600 uppercase tracking-wide">Total</div>
                  </div>
                  
                  {/* Exitosas */}
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-900">{resumenPaginas.exitosas}</div>
                    <div className="text-xs text-green-600 uppercase tracking-wide">Exitosas</div>
                  </div>
                  
                  {/* Fallidas */}
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-900">{resumenPaginas.fallidas}</div>
                    <div className="text-xs text-red-600 uppercase tracking-wide">Fallidas</div>
                  </div>
                  
                  {/* Porcentaje éxito */}
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-900">{resumenPaginas.porcentajeExito}%</div>
                    <div className="text-xs text-blue-600 uppercase tracking-wide">% Éxito</div>
                  </div>
                </div>
                
                {/* Lista compacta de páginas fallidas - JUSTO DEBAJO */}
                {hayPaginasFallidas && paginasFallidas.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center text-sm">
                      <span className="text-red-600 font-bold mr-2">❌</span>
                      <span className="text-gray-700 font-medium">
                        Página{paginasFallidas.length > 1 ? 's' : ''} sin screenshot: 
                      </span>
                      <span className="text-red-700 font-bold ml-1">
                        {paginasFallidas.map(p => p.codigo).join(', ')}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* LÍNEA DE EMERGENCIA - Siempre muestra si hay fallidas según el resumen */}
                {(!hayPaginasFallidas || paginasFallidas.length === 0) && resumenPaginas.fallidas > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-300 bg-red-50 p-3 rounded">
                    <div className="flex items-center text-sm">
                      <span className="text-red-600 font-bold mr-2 text-base">⚠️</span>
                      <div className="flex-1">
                        <span className="text-red-700 font-bold">
                          {resumenPaginas.fallidas} página{resumenPaginas.fallidas > 1 ? 's' : ''} sin screenshot detectada{resumenPaginas.fallidas > 1 ? 's' : ''}
                        </span>
                        <div className="text-red-600 text-xs mt-1">
                          Por favor - revisar manualmente 
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mensaje si no hay proceso activo */}
          {!cliente.proceso_activo && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-gray-600 text-lg">No hay procesos activos para este cliente</p>
              <p className="text-gray-500 text-sm mt-2">
                Use "Seleccionar Páginas" para iniciar un nuevo proceso de consulta
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {procesoEstaCompletado && (
              <span className="text-green-600 font-medium">✅ Proceso completado • Reporte disponible</span>
            )}
            {cliente.estado === 'Procesando' && (
              <span className="text-blue-600 font-medium">🔄 Procesando • Se actualiza automáticamente</span>
            )}
            {hayPaginasFallidas && (
              <span className="text-red-600 font-medium ml-4">⚠️ {paginasFallidas.length} páginas sin screenshot</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
  {/* Botón de descarga */}
  {procesoEstaCompletado && cliente.proceso_activo?.proceso_id && (
    <button
      onClick={() => descargarReporte(cliente.proceso_activo.proceso_id)}
      disabled={loading}
      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
      title="Descargar Reporte DOCX"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Descargando...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Descargar Reporte
        </>
      )}
    </button>
  )}

  {/* Botón cerrar */}
  <button
    onClick={onClose}
    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
  >
    Cerrar
  </button>
</div>

        </div>
      </div>
    </div>
  );
};

export default ModalDetallesMejorado;