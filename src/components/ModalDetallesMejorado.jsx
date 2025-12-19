// src/components/ModalDetallesMejorado.jsx - VERSIÓN ACTUALIZADA
import React, { useState } from 'react';

const ModalDetallesMejorado = ({ 
  cliente, 
  isVisible, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

  // ===== UTILIDADES =====
  
  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'N/A';
    try {
      return new Date(fechaISO).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const formatearFechaSolo = (fechaISO) => {
    if (!fechaISO) return 'N/A';
    try {
      return new Date(fechaISO).toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const valorONoAplica = (valor) => {
    if (!valor || valor.toString().trim() === '') return 'No aplica';
    return valor;
  };

  const construirNombreCompleto = (apellidos, nombres) => {
    const apellidosLimpio = (apellidos || '').trim();
    const nombresLimpio = (nombres || '').trim();
    
    if (apellidosLimpio && nombresLimpio) {
      return `${apellidosLimpio} ${nombresLimpio}`;
    } else if (apellidosLimpio) {
      return apellidosLimpio;
    } else if (nombresLimpio) {
      return nombresLimpio;
    }
    return 'No aplica';
  };

  // ===== DESCARGA DE REPORTE =====
  
  const descargarReporte = async () => {
    if (!cliente?.id) {
      setError('No se puede descargar: cliente no identificado');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${BASE}/tracking/clientes/${cliente.id}/reporte/download`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No hay reporte disponible para este cliente');
        }
        throw new Error(`Error ${response.status}: No se pudo descargar el reporte`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Obtener nombre del archivo del header o generar uno
      const disposition = response.headers.get('Content-Disposition');
      let filename = `reporte_${cliente.APELLIDOS_CLIENTE || 'cliente'}_${cliente.NOMBRES_CLIENTE || ''}.docx`;
      
      if (disposition) {
        const filenameMatch = disposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename.replace(/[^a-zA-Z0-9_\-.]/g, '_');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Descarga iniciada:', filename);
      
    } catch (err) {
      console.error('❌ Error descargando reporte:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== ESTADO DEL PROCESO =====
  
  const getEstadoConfig = (estado) => {
    const configs = {
      'Procesado': { 
        color: 'bg-green-100 text-green-800 border-green-300', 
        icono: '✅', 
        texto: 'Procesado' 
      },
      'En_Proceso': { 
        color: 'bg-blue-100 text-blue-800 border-blue-300', 
        icono: '🔄', 
        texto: 'En Proceso' 
      },
      'Procesando': { 
        color: 'bg-blue-100 text-blue-800 border-blue-300', 
        icono: '🔄', 
        texto: 'En Proceso' 
      },
      'Pendiente': { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
        icono: '⏳', 
        texto: 'Pendiente' 
      },
      'Error': { 
        color: 'bg-red-100 text-red-800 border-red-300', 
        icono: '❌', 
        texto: 'Error' 
      }
    };
    return configs[estado] || { color: 'bg-gray-100 text-gray-800 border-gray-300', icono: '❓', texto: estado || 'Desconocido' };
  };

  // ===== VERIFICACIONES =====
  
  const estadoConfig = getEstadoConfig(cliente?.ESTADO_CONSULTA);
  const esProcesado = cliente?.ESTADO_CONSULTA === 'Procesado';
  
  const tieneConyuge = cliente?.CEDULA_CONYUGE || cliente?.NOMBRES_CONYUGE || cliente?.APELLIDOS_CONYUGE;
  const tieneCodeudor = cliente?.CEDULA_CODEUDOR || cliente?.NOMBRES_CODEUDOR || cliente?.APELLIDOS_CODEUDOR;

  // ===== RENDER =====
  
  if (!isVisible || !cliente) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* ===== HEADER ===== */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Detalles del Cliente
            </h2>
            <p className="text-blue-100 mt-1 text-lg">
              {construirNombreCompleto(cliente.APELLIDOS_CLIENTE, cliente.NOMBRES_CLIENTE)}
              {cliente.CEDULA && ` • CI: ${cliente.CEDULA}`}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 text-3xl font-light transition-colors p-2"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* ===== CONTENIDO ===== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Error si existe */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div className="text-red-700">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ===== SECCIÓN 1: INFORMACIÓN DE LA SOLICITUD ===== */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
             <span className="mr-2 text-blue-500">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
    <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd" />
    <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
  </svg>
</span>
              Información de la Solicitud
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">ID Solicitud</label>
                <p className="mt-1 text-sm font-semibold text-gray-900">{valorONoAplica(cliente.ID_SOLICITUD)}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Producto</label>
                <p className="mt-1 text-sm font-medium text-gray-900">{valorONoAplica(cliente.PRODUCTO)}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Agencia</label>
                <p className="mt-1 text-sm text-gray-900">{valorONoAplica(cliente.AGENCIA)}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Estado Civil</label>
                <p className="mt-1 text-sm text-gray-900">{valorONoAplica(cliente.ESTADO_CIVIL)}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha Solicitud</label>
                <p className="mt-1 text-sm text-gray-900">{formatearFechaSolo(cliente.FECHA_CREACION_SOLICITUD)}</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Estado en Sistema</label>
                <p className="mt-1 text-sm text-gray-900">{valorONoAplica(cliente.ESTADO)}</p>
              </div>
            </div>
          </div>

          {/* ===== SECCIÓN 2: PERSONAS RELACIONADAS ===== */}
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <span className="mr-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
</svg>
</span>
              Personas Relacionadas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cónyuge */}
              <div className={`p-4 rounded-lg border ${tieneConyuge ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center mb-2">
                  <span className="text-xl mr-2"> <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#da0c3fff"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    className="lucide lucide-heart"
  >
    <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>
  </svg></span>
                  <span className="font-semibold text-gray-700">Cónyuge</span>
                </div>
                {tieneConyuge ? (
                  <div className="space-y-1 ml-7">
                    <p className="text-sm font-medium text-gray-900">
                      {construirNombreCompleto(cliente.APELLIDOS_CONYUGE, cliente.NOMBRES_CONYUGE)}
                    </p>
                    <p className="text-sm text-gray-600">
                      CI: {valorONoAplica(cliente.CEDULA_CONYUGE)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 ml-7 italic">Sin cónyuge registrado</p>
                )}
              </div>
              
              {/* Codeudor */}
              <div className={`p-4 rounded-lg border ${tieneCodeudor ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center mb-2">
                  <span className="text-xl mr-2"><svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3b82f6"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    className="lucide lucide-handshake"
  >
    <path d="m11 17 2 2a1 1 0 1 0 3-3"/>
    <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/>
    <path d="m21 3 1 11h-2"/>
    <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/>
    <path d="M3 4h8"/>
  </svg></span>
                  <span className="font-semibold text-gray-700">Codeudor</span>
                </div>
                {tieneCodeudor ? (
                  <div className="space-y-1 ml-7">
                    <p className="text-sm font-medium text-gray-900">
                      {construirNombreCompleto(cliente.APELLIDOS_CODEUDOR, cliente.NOMBRES_CODEUDOR)}
                    </p>
                    <p className="text-sm text-gray-600">
                      CI: {valorONoAplica(cliente.CEDULA_CODEUDOR)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 ml-7 italic">Sin codeudor registrado</p>
                )}
              </div>
            </div>
          </div>

          {/* ===== SECCIÓN 3: ESTADO DEL PROCESO ===== */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="#10b981"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    className="lucide lucide-bar-chart-2"
  >
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg></span>
              Estado del Proceso
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Estado de Consulta */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Estado Consulta</label>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${estadoConfig.color}`}>
                  <span className="mr-2">{estadoConfig.icono}</span>
                  {estadoConfig.texto}
                </span>
              </div>
              
              {/* Fecha de Registro */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Fecha Registro RPA</label>
                <p className="text-sm font-medium text-gray-900">{formatearFecha(cliente.FECHA_CREACION_REGISTRO)}</p>
              </div>
              
              {/* Reporte */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Reporte</label>
                {esProcesado ? (
                  <span className="inline-flex items-center text-green-600 font-medium">
                    <span className="mr-1">📄</span>
                    Disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center text-gray-500">
                    <span className="mr-1">⏳</span>
                    {cliente.ESTADO_CONSULTA === 'Pendiente' ? 'Pendiente' : 'En proceso'}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ===== FOOTER ===== */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            
            {/* Mensaje de estado */}
            <div className="text-sm text-gray-600">
              {esProcesado && (
                <span className="text-green-600 font-medium flex items-center">
                  <span className="mr-2">✅</span>
                  Proceso completado • Reporte disponible para descarga
                </span>
              )}
              {cliente.ESTADO_CONSULTA === 'En_Proceso' || cliente.ESTADO_CONSULTA === 'Procesando' ? (
                <span className="text-blue-600 font-medium flex items-center">
                  <span className="mr-2">🔄</span>
                  Procesando consulta...
                </span>
              ) : null}
              {cliente.ESTADO_CONSULTA === 'Pendiente' && (
                <span className="text-yellow-600 font-medium flex items-center">
                  <span className="mr-2">⏳</span>
                  Pendiente de procesamiento
                </span>
              )}
              {cliente.ESTADO_CONSULTA === 'Error' && (
                <span className="text-red-600 font-medium flex items-center">
                  <span className="mr-2">❌</span>
                  Error en el procesamiento
                </span>
              )}
            </div>
            
            {/* Botones */}
            <div className="flex items-center gap-3">
              {/* Botón de descarga - solo si está procesado */}
              {esProcesado && (
                <button
                  onClick={descargarReporte}
                  disabled={loading}
                  className="flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md font-medium"
                  title="Descargar Reporte DOCX"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
                className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetallesMejorado;