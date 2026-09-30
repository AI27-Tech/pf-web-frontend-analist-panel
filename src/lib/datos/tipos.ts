/**
 * Tipos del panel. NO son los documentos de Firestore: son lo que las pantallas
 * consumen, y los mappers de `src/lib/datos/` traducen de uno al otro.
 *
 * Esa separación es lo que permite cambiar de fuente de datos —de Firebase a un BFF
 * en Go, cuando la identidad de la plataforma esté lista— sin tocar una sola pantalla.
 *
 * El contrato de origen lo define pf-app-custodio/docs/PLAN.md §5.1. Este panel es
 * SÓLO LECTURA: no escribe ni un documento.
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
 */
export function etiquetaVisible(medio: Pick<Medio, 'etiquetas'>): string {
  return medio.etiquetas[0] ?? 'Sin etiqueta';
}

/** Un viaje: el contenedor de los archivos de un servicio. */
export interface Viaje {
  id: string;
  placas: string;
  custodioTelefono: string;
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
  /** Nombre resuelto desde `usuarios/{uid}`, o teléfono/uid como respaldo. */
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
}

/** Estadísticas de una unidad (placa) en el periodo, para la gráfica «viajes por unidad».
 *  Una entrada por placa distinta que aparezca en los reportes del periodo. */
export interface EstadisticaUnidad {
  placas: string;
  viajes: number;
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
  /** Se satisface por PERTENENCIA en `Viaje.etiquetas`, no por igualdad. */
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
  etiqueta?: string;
  placas?: string;
  custodioUid?: string;
  limite?: number;
}
