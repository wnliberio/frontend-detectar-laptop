export default function ConfirmModal({ open, onCancel, onConfirm, loading }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-[520px] max-w-[92vw] bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold">Confirmación</h3>
        <p className="text-stone-300 mt-2">
          ¿Estás seguro de enviar?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-stone-700 hover:bg-stone-800 transition"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="button-primary"
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Sí, enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
