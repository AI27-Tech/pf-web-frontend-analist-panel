/**
 * Tipos del panel. NO son los documentos de Firestore: son lo que las pantallas
 * consumen, y los mappers de `src/lib/datos/` traducen de uno al otro.
 *
 * Esa separación es lo que permite cambiar de fuente de datos —de Firebase a un BFF
 * en Go, cuando la identidad de la plataforma esté lista— sin tocar una sola pantalla.
 *
 * El contrato de origen lo define pf-app-custodio/docs/PLAN.md §5.1. El panel era sólo
 * lectura hasta Echo 04: la corrección del vínculo es su primera escritura (cinco campos
 * de auditoría en `reportes`, ver `enviosFirestore.ts`), autorizada por la regla de 01.
 */

export type CicloViaje = 'ACTIVO' | 'CERRADO' | 'DESCARTADO';
export type EstadoSubida = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETA' | 'FALLIDA';
export type TipoMedio = 'FOTO' | 'AUDIO';

/**
 * Catálogo cerrado de estados operativos.
 */
export type EstadoOperativo =
  | 'activo'
  | 'alerta_desvio'
  | 'en_ruta'
  | 'sin_novedad'
  | 'sellado_forense'
  | 'en_revision'
  | 'sin_senal'
  | 'sincronizacion_en_vivo'
  | 'expedientes_registrados';

/** Ubicación de una captura, con su confiabilidad. Una posición sin precisión ni
 *  antigüedad no se puede juzgar, así que las tres viajan juntas. */
export interface Ubicacion {
  latitud: number;
  longitud: number;
  precisionMetros: number;
  antiguedadMs: number;
}

/** Un archivo capturado en campo: el reemplazo de un mensaje de WhatsApp. */
export interface Medio {
  id: string;
  viajeId: string;
  tipo: TipoMedio;
  /** Etiquetas del catálogo. Es un ARRAY en el contrato del productor —un medio puede
   *  llevar varias (`medios.etiquetas`, pf-app-custodio §5.1)—, no una sola cadena.
   *  Para mostrar una etiqueta suelta en la UI, usa `etiquetaVisible(medio)`. */
  etiquetas: string[];
  rutaOriginal: string;
  rutaMiniatura: string | null;
  capturadoEn: Date;
  recibidoEn: Date | null;
  ubicacion: Ubicacion | null;
  ubicacionTexto: string | null;
  comentario: string | null;
  bytes: number;
  duracionMs: number | null;
  placas: string;
  custodioUid: string;
  custodioNombre?: string;
  fechaLocal: string;
}

/**
 * Etiqueta visible de un medio para la UI: la primera del array, o «Sin etiqueta» si no
 * trae ninguna.
 *
 * Un `Medio` puede llevar varias etiquetas, pero la mayoría de las vistas (visor,
 * miniatura, agrupación del expediente) muestran una sola. Centralizar la elección aquí
 * evita esparcir `etiquetas[0]` por toda la interfaz y da un texto consistente cuando el
 * array viene vacío.
 *
 * RETIRO DE ETIQUETADO (ver docs/PLAN_RETIRO_ETIQUETADO.md): la UI de etiqueta está
 * retirada —la app custodio dejó de enviar `etiquetas` (llegan vacías)—, pero este
 * contrato de lectura (`Medio.etiquetas`, `Viaje.etiquetas`, `FiltrosViaje.etiqueta`,
 * `FiltrosMedio.etiqueta` y esta función) se CONSERVA inerte, no se borra, para poder
 * reactivar el filtro de la galería y la agrupación del expediente descomentando, sin
 * reconstruir tipos ni fuentes cuando la etiqueta vuelva.
 */
export function etiquetaVisible(medio: Pick<Medio, 'etiquetas'>): string {
  return medio.etiquetas[0] ?? 'Sin etiqueta';
}

/** Un viaje: el contenedor de los archivos de un servicio. */
export interface Viaje {
  id: string;
  placas: string;
  custodioCorreo: string;
  custodioName?: string;
  custodioUid: string;
  fechaLocal: string;
  abiertoEn: Date;
  cerradoEn: Date | null;
  comentario: string | null;
  isUpdated: boolean;
  ciclo: CicloViaje;
  motivoDescarte: string | null;
  subida: EstadoSubida;
  completo: boolean;
  mediosEsperados: number;
  uploadedFiles: number;
  estados: EstadoOperativo[];
  etiquetas: string[];
  fotos: number;
  audios: number;
}

/** Estadísticas de un custodio en el periodo, para la tabla «Estadísticas por custodio»
 *  del reporte. Una fila por `custodioUid` que aparezca en los reportes o medios del
 *  periodo. El total de medios (fotos + audios) se calcula en la UI. */
export interface EstadisticaCustodio {
  uid: string;
  /** Nombre resuelto desde `usuarios/{uid}`, o correo/uid como respaldo. */
  nombre: string;
  viajes: number;
  fotos: number;
  audios: number;
}

/** Fila de la tabla «Registro por viaje» del reporte: un viaje del periodo con sus
 *  conteos de medios y los custodios que participaron. */
export interface FilaViaje {
  id: string;
  placas: string;
  /** Nombres resueltos de los custodios que participaron en el viaje. */
  custodios: string[];
  fechaLocal: string;
  fotos: number;
  audios: number;
  ciclo: CicloViaje;
  /** `true` si el viaje tiene novedad (incidencia). Permite recalcular la tarjeta de
   *  incidencias cuando el reporte se filtra. */
  hayNovedad: boolean;
  /** Envío al que el seguimiento quedó vinculado (Echo 03/04). `null` cuando no tiene. */
  shipmentId: string | null;
}

/** Estadísticas de una unidad (placa) en el periodo, para la gráfica «viajes por unidad».
 *  Una entrada por placa distinta que aparezca en los reportes del periodo. */
export interface EstadisticaUnidad {
  placas: string;
  viajes: number;
}

/** Estadísticas de un envío en el periodo, para la gráfica «envíos del periodo». Una
 *  entrada por Shipment ID (o «Sin envío» para los reportes sin vínculo); los
 *  descartados no cuentan y las validaciones son fotos más audios de sus seguimientos. */
export interface EstadisticaEnvio {
  shipmentId: string;
  seguimientos: number;
  validaciones: number;
}

/** Categoría de una etiqueta del catálogo (pf-app-custodio §5.1). */
export type CategoriaEtiqueta = 'SITUACION' | 'EVIDENCIA';

/**
 * Valor del catálogo de etiquetas.
 */
export interface Etiqueta {
  id: string;
  nombre: string;
  categoria?: CategoriaEtiqueta;
  orden: number;
  activo: boolean;
}

export interface FiltrosViaje {
  /** `YYYY-MM-DD` en zona de México. */
  desde: string;
  hasta: string;
  /** Coincidencia parcial, sin acentos ni mayúsculas. */
  placas?: string;
  /** Coincidencia parcial sobre `custodioName`. */
  custodioName?: string;
  custodioUid?: string;
  /** Se satisface por PERTENENCIA en `Viaje.etiquetas`, no por igualdad.
   *  RETIRO DE ETIQUETADO (docs/PLAN_RETIRO_ETIQUETADO.md): la UI que lo usaba está
   *  retirada; el campo se conserva inerte para reactivación. */
  etiqueta?: string;
  isUpdated?: boolean;
  /** Base 1, como `Pagination` de la librería. */
  page: number;
  pageSize: number;
}

/** Una página de resultados más el total que satisface los filtros. El total es lo
 *  que `Pagination` necesita para saber cuántas páginas hay. */
export interface ViajesPage {
  viajes: Viaje[];
  total: number;
}

/** Filtros de la galería: archivos entre viajes acotados por periodo, etiqueta y tipo.
 *  Comparte `desde`/`hasta` (cadena `YYYY-MM-DD`) con la pantalla de Viajes. */
export interface FiltrosMedio {
  desde: string;
  hasta: string;
  tipo?: TipoMedio;
  /** RETIRO DE ETIQUETADO (docs/PLAN_RETIRO_ETIQUETADO.md): filtro de categoría retirado
   *  de la UI; el campo se conserva inerte para reactivación. */
  etiqueta?: string;
  placas?: string;
  custodioUid?: string;
  limite?: number;
}

/** Un envío registrado por Checklist: `envios/{shipmentId}` en Firestore. */
export interface Envio {
  shipmentId: string;
  clienteId: string;
  numeroEconomico: string;
  lineaTransportista: string;
  bitacoraLegacyId: string;
  createdAtServer: Date | null;
  vigente: boolean;
}

/** Un seguimiento vinculado a un envío, sin sus medios: la forma cruda que produce la
 *  consulta de `reportes`. */
export interface ReporteVinculado {
  id: string;
  clienteId: string;
  ciclo: CicloViaje;
  fechaLocal: string;
  placas: string;
  custodioCorreo: string;
  abiertoEn: Date;
}

/** Un seguimiento del envío con sus medios ya agrupados. */
export interface EnvioSeguimiento extends ReporteVinculado {
  medios: Medio[];
}

/** Vista completa de un envío para el reporte por Shipment ID. */
export interface VistaEnvio {
  envio: Envio;
  seguimientos: EnvioSeguimiento[];
  /** `true` si la lectura de medios rebasó el tope: faltan archivos del envío. */
  recortado: boolean;
}

/** Resultado de corregir el vínculo de un seguimiento: `cambio: false` significa que el
 *  valor ya era ese y no hubo escritura. */
export type ResultadoCorreccion = { ok: true; cambio: boolean } | { ok: false; mensaje: string };
