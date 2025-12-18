// Reglas por campo (longitud máx. y patrón)
export const RULES = {
  ruc: {
    label: "RUC",
    max: 13,
    pattern: /^\d{10,13}$/, // permitimos 10–13 por si alimentan RUC base/cedula
    message: "Debe contener solo dígitos (10–13)."
  },
  apellidos: {
    label: "Interpol",
    max: 60,
    pattern: /^[A-ZÁÉÍÓÚÑ]{2,}(?: [A-ZÁÉÍÓÚÑ]{2,})*$/,
    message: "Solo letras y espacios (3–60)."
  },
  placa: {
    label: "Placa",
    max: 7, // ABC1234 (7–8 con guion)
    pattern: /^[A-Z]{3}-?\d{3,4}$/,
    message: "Formato esperado: ABC-1234."
  }
}

export function sanitize(key, value) {
  const v = (value ?? "").toString().toUpperCase().trim()

  if (key === "ruc") {
    // Solo dígitos
    return v.replace(/\D/g, "").slice(0, RULES.ruc.max)
  }
  if (key === "apellidos") {
    // Letras y espacios intermedios, convertir a mayúsculas, quitar espacios extremos
  const v = (value ?? "").toString().toUpperCase()
  return v
    .replace(/[^A-ZÁÉÍÓÚÑ ]/g, "") // solo letras y espacios
    .replace(/\s+/g, " ")          // evita múltiples espacios seguidos
    .trim()                        // quita espacios al inicio y final
    .slice(0, RULES.apellidos.max)
 }
  if (key === "placa") {
    // Letras, numeros, 1 guion opcional
    return v.replace(/[^A-Z0-9-]/g, "").slice(0, RULES.placa.max)
  }
  return v
}

export function validate(values, selected) {
  const errors = {}

  Object.entries(selected).forEach(([key, isOn]) => {
    if (!isOn) return
    const rule = RULES[key]
    const raw = (values[key] ?? "").toString().toUpperCase()

    if (!raw) {
      errors[key] = `Ingresa ${rule.label}.`
      return
    }

    if (raw.length > rule.max) {
      errors[key] = `Máximo ${rule.max} caracteres.`
      return
    }

    if (!rule.pattern.test(raw)) {
      errors[key] = rule.message
    }
  })

  const selectedCount = Object.values(selected).filter(Boolean).length
  const isValid = selectedCount > 0 && Object.keys(errors).length === 0

  return { errors, isValid, selectedCount }
}
