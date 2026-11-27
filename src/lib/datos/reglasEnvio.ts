/**
 * Reglas puras del alta de envíos (Echo 06): formato de cada campo, normalización y
 * validación. No toca Firebase ni el DOM, así que se prueba sin ellos.
 *
 * Los cuatro campos y sus formatos salen de la ficha técnica legacy y de las capturas de
 * Producto:
 * - Shipment ID: exactamente 10 dígitos.
 * - ID de bitácora: `AB` seguido de 7 dígitos (9 caracteres).
 * - Número económico: se compara con el mismo criterio con que Echo guarda `placas`
 *   (`normalizarPlaca` en `Fechas.kt` de la app): mayúsculas, solo letras y dígitos.
 * - Línea transportista: texto libre, obligatorio.
 *
 * El servidor repite estas reglas: lo de aquí evita viajes de red inútiles y da mensajes
 * junto al campo; no es la barrera de seguridad.
 */

/** Los cuatro datos que captura Checklist. La empresa no está aquí: la asigna el perfil. */
export interface DatosEnvio {
  shipmentId: string;
  lineaTransportista: string;
  numeroEconomico: string;
  bitacoraLegacyId: string;
}

export type CampoEnvio = keyof DatosEnvio;
export type ErroresEnvio = Partial<Record<CampoEnvio, string>>;

export const LONGITUD_SHIPMENT_ID = 10;
export const LONGITUD_BITACORA = 9;
/** Tope de la línea transportista. Evita pegar un párrafo; no es una regla de negocio. */
export const TOPE_LINEA_TRANSPORTISTA = 120;
/** Tope del número económico escrito a mano. Igual que el anterior: solo limita el campo. */
export const TOPE_NUMERO_ECONOMICO = 20;

const PATRON_SHIPMENT_ID = /^\d{10}$/;
const PATRON_BITACORA = /^AB\d{7}$/;

/**
 * Número económico en la forma en que se guarda: mayúsculas, solo letras y dígitos. Es el
 * mismo criterio de `normalizarPlaca` de Echo. Conserva los ceros iniciales: es texto,
 * nunca un número (`042` sigue siendo `042`).
 */
export function normalizarEconomico(texto: string): string {
  return texto.toUpperCase().replace(/[^\p{L}\p{Nd}]/gu, '');
}

/** Lo que se acepta al escribir el Shipment ID: solo dígitos, hasta 10. */
export function normalizarShipmentId(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, LONGITUD_SHIPMENT_ID);
}

/** Lo que se acepta al escribir la bitácora: mayúsculas y alfanuméricos, hasta 9. */
export function normalizarBitacora(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LONGITUD_BITACORA);
}

export function esShipmentIdValido(valor: string): boolean {
  return PATRON_SHIPMENT_ID.test(valor);
}

export function esBitacoraValida(valor: string): boolean {
  return PATRON_BITACORA.test(valor);
}

/** Mensajes de error por campo. Vacío (`{}`) significa que los cuatro datos son válidos. */
export function validarEnvio(datos: DatosEnvio): ErroresEnvio {
  const errores: ErroresEnvio = {};
  if (datos.shipmentId === '') {
    errores.shipmentId = 'Captura el Shipment ID.';
  } else if (!esShipmentIdValido(datos.shipmentId)) {
    errores.shipmentId = `El Shipment ID son ${LONGITUD_SHIPMENT_ID} dígitos y llevas ${datos.shipmentId.length}.`;
  }
  if (datos.lineaTransportista.trim() === '') {
    errores.lineaTransportista = 'Captura la línea transportista.';
  }
  if (normalizarEconomico(datos.numeroEconomico) === '') {
    errores.numeroEconomico = 'Elige o escribe el número económico.';
  }
  if (!esBitacoraValida(datos.bitacoraLegacyId)) {
    errores.bitacoraLegacyId = 'La bitácora es AB seguido de 7 dígitos.';
  }
  return errores;
}

/**
 * Forma canónica de la captura: es lo que se envía a la función de alta. La línea
 * transportista se recorta y se colapsan los espacios repetidos; el resto ya llega
 * normalizado desde el formulario, pero se vuelve a aplicar para que quien llame a la capa
 * de datos no dependa de eso.
 */
export function normalizarDatosEnvio(datos: DatosEnvio): DatosEnvio {
  return {
    shipmentId: datos.shipmentId.trim(),
    lineaTransportista: datos.lineaTransportista.trim().replace(/\s+/g, ' '),
    numeroEconomico: normalizarEconomico(datos.numeroEconomico),
    bitacoraLegacyId: datos.bitacoraLegacyId.trim().toUpperCase(),
  };
}

/**
 * Lista de números económicos lista para el selector: solo textos normalizados, sin
 * repetidos ni vacíos, en orden natural (`2` antes que `10`). Una respuesta con otra forma
 * no rompe el formulario: se interpreta como lista vacía y el usuario puede escribir el
 * número a mano.
 */
export function limpiarNumerosEconomicos(crudo: unknown): string[] {
  if (!Array.isArray(crudo)) return [];
  const unicos = new Set<string>();
  for (const elemento of crudo) {
    if (typeof elemento !== 'string') continue;
    const normalizado = normalizarEconomico(elemento);
    if (normalizado) unicos.add(normalizado);
  }
  return [...unicos].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}
