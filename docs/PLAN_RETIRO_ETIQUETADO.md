# PLAN_RETIRO_ETIQUETADO — Panel sin filtro ni agrupación por etiqueta

## 1. Qué es y por qué

La app `pf-app-custodio` retira el etiquetado: los `medios` dejan de traer `etiquetas` (llegan con
el array vacío). Este panel hoy **filtra** por etiqueta en la galería y **agrupa** por etiqueta en el
expediente, así que esos dos puntos se quedan sin señal.

La decisión fue dejar el código de etiqueta **comentado, no borrado**, y mostrar todo sin categoría
mientras tanto. El contrato de lectura no cambia: `Medio.etiquetas`, `Viaje.etiquetas`, los filtros
`FiltrosViaje.etiqueta`/`FiltrosMedio.etiqueta` y el helper `etiquetaVisible` se conservan inertes
para poder reactivarlos sin reconstruirlos.

Es una de tres partes del mismo cambio. Las otras: `../../pf-app-custodio/docs/PLAN_RETIRO_ETIQUETADO.md`
(la app) y `../../pf-infra-firebase/docs/PLAN_RETIRO_ETIQUETADO.md` (el perímetro).

## 2. Qué NO cambia (fuera de alcance)

- El contrato de lectura en `src/lib/datos/tipos.ts`: se conservan `Medio.etiquetas`,
  `Viaje.etiquetas`, `FiltrosViaje.etiqueta`, `FiltrosMedio.etiqueta` y `etiquetaVisible`.
- La capa de datos (`src/lib/datos/`) y la frontera con Firebase: ninguna pantalla importa el SDK;
  esta regla sigue intacta.
- La novedad y la tarjeta de "Incidencias registradas" (ver §6). **No se tocan** (decisión C).
- El visor, su resolución de original y las miniaturas.

## 3. Estado actual verificado

- `src/features/galeria/GaleriaSection.tsx`: define un filtro `{ key: 'etiqueta', label:
'Categoría' }` construido con `medios.flatMap((m) => m.etiquetas)`, y lo aplica en
  `matchesFiltersAndSearch` (`filterValues.etiqueta ... !includes(...)`). La `ImageCard` usa
  `medio.etiquetas?.[0] || medio.tipo` como badge derecho; la columna de lista "Etiqueta" usa
  `etiquetaVisible(medio)`.
- `src/features/expediente/ExpedienteGaleria.tsx`: `agruparPorEtiqueta` agrupa todos los medios por
  `etiquetaVisible` y arma una `CarouselSection` por grupo; los badges usan `etiquetaVisible`.
- `src/lib/datos/tipos.ts`: `etiquetaVisible` y los campos `etiqueta` de los filtros.
- Pruebas: `src/features/expediente/ExpedienteGaleria.test.tsx` afirma la agrupación por etiqueta;
  `src/lib/datos/tipos.test.ts` prueba `etiquetaVisible`.

## 4. Convención de nombres

Prosa y comentarios en español (México); identificadores técnicos en inglés, salvo los sustantivos
de dominio (`etiqueta`, `medio`, `viaje`). Fuente: `.kiro/steering/naming-conventions.md` y
`decision-log.md` DEC-024. El cambio solo comenta código existente, no introduce nombres nuevos.

## 5. Tareas (verificables una a una)

Verificación de cada tarea: `pnpm lint` (incluye la regla de frontera de datos y los no-usados),
`pnpm typecheck`, `pnpm test` y `pnpm build`.

### 5.1 Galería sin filtro de categoría

En `GaleriaSection.tsx`, comentar la definición del filtro `'etiqueta'` ("Categoría") y la rama
`filterValues.etiqueta` de `matchesFiltersAndSearch`. Conservar los filtros de tipo, unidad y
custodio, y la búsqueda. El badge de la tarjeta cae a `medio.tipo` cuando `etiquetas` está vacío
(ya es su respaldo actual); la etiqueta del visor conserva su respaldo `'Sin etiqueta'`.

**Demo:** la galería lista todos los archivos sin selector de categoría; filtra por tipo, unidad y
custodio.

### 5.2 Expediente en una sola sección plana

En `ExpedienteGaleria.tsx`, comentar `agruparPorEtiqueta` y su uso; renderizar una sola
`CarouselSection` ("Evidencias" + conteo real) sobre todos los medios del viaje, conservando el
visor. Los badges que usaban `etiquetaVisible` caen a la hora de captura / tipo.

**Test:** actualizar `ExpedienteGaleria.test.tsx` de la aserción de agrupación a la de sección única.

**Demo:** el expediente de un viaje muestra todos sus archivos en una sola sección.

### 5.3 Contrato inerte, no borrado

En `src/lib/datos/tipos.ts`, conservar `Medio.etiquetas`, `Viaje.etiquetas`,
`FiltrosViaje.etiqueta`, `FiltrosMedio.etiqueta` y `etiquetaVisible`; añadir una nota de que la UI de
etiqueta está retirada pero el contrato se retiene para reactivación. `tipos.test.ts` se conserva
(la función sigue existiendo). Si al comentar el uso de `etiquetaVisible` el lint lo marca como
no-usado, mantenerlo con una anotación o un uso dormido documentado, no borrarlo.

**Demo:** `pnpm typecheck` y `pnpm lint` verdes con el contrato intacto.

## 6. Novedad e incidencias: deliberadamente intactas (decisión C)

La app deja de marcar `hayNovedad` (queda `false` siempre). En consecuencia, la tarjeta "Incidencias
registradas" leerá 0 y el filtro de novedad (`isUpdated`) queda inerte. **Se decidió no tocar nada
de eso** en el panel: ni el filtro de novedad de `ViajesFilters`/`FiltrosActivos`, ni el cálculo de
incidencias en `metricasFirestore.ts`/`filtros.ts`. Queda como señal inerte hasta que la novedad
vuelva. Esta sección existe para que esa inercia sea una decisión registrada y no un olvido.

## 7. Verificación de cierre

- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` verdes.
- La galería y el expediente muestran todos los medios sin categoría; el visor sigue funcionando.
- El código de etiqueta queda comentado/inerte, no borrado; el contrato de `tipos.ts` intacto.
- Registrar el cambio en `CHANGELOG.md`.

## 8. Reactivación futura

Reactivar es descomentar: el filtro de categoría de la galería, `agruparPorEtiqueta` del expediente
y los badges por `etiquetaVisible`. Como el contrato (`etiquetas`, los filtros, `etiquetaVisible`)
nunca se removió, no hay tipos ni fuentes que reconstruir.
