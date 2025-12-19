export default function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  loading,

  // Props opcionales para personalización
  // Si no se pasan, se usan estos valores por defecto
  title = "Confirmación",
  mainMessage = "¿Está seguro de Iniciar las Consultas?",
  subMessage = "Se procesa una consulta por solicitud cada 30 minutos y solo para solicitudes en estado “Trámite”.",
  confirmText = "Sí, Iniciar"
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo semitransparente */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Contenido del modal */}
      <div className="relative w-[520px] max-w-[92vw] bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-soft">
        
        {/* Título */}
        <h3 className="text-lg font-semibold text-white">{title}</h3>

        {/* Mensaje principal */}
        <p className="text-stone-300 mt-1">
          {mainMessage}
        </p>

        {/* Submensaje en cursiva */}
        <p className="text-stone-300 mt-1 italic text-sm">
          {subMessage}
        </p>

        {/* Botones */}
        <div className="mt-6 flex justify-end gap-3">
          
          {/* Botón Cancelar */}
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-stone-700 hover:bg-stone-800 transition"
            disabled={loading}
          >
            Cancelar
          </button>

          {/* Botón Confirmar */}
          <button
            onClick={onConfirm}
            className="button-primary"
            disabled={loading}
          >
            {loading ? "Procesando…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
