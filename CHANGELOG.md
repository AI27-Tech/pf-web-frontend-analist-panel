# CHANGELOG

Registro de cambios del proyecto Panel del analista. Las entradas más recientes van primero.

## 2026:09:25 18:02 — Corregir `auth/invalid-api-key`: versionar `.env.production`

**Resumen:** el sitio desplegado cargaba pero fallaba con `FirebaseError: auth/invalid-api-key`. Causa: la config del SDK web (`VITE_FIREBASE_*`) se inyecta en tiempo de build desde `.env`, que es por máquina y no se versiona, así que el build de GitHub Actions compilaba con `apiKey` vacío. Se agregó `.env.production` (versionado) con los valores del SDK web, que Vite carga automáticamente en `vite build`. Estos valores no son secretos: identifican el proyecto y viajan en el bundle del cliente de todos modos; la autorización vive en las reglas de Firestore/Storage.

**Cambios:**

- Se creó `.env.production` con la config del SDK web de Firebase del proyecto `custodio-906e7268`.
- Se desidignoró `.env.production` en `.gitignore` (junto a `.env.example` y `.env.test`).

**Verificación:** build de producción con el `.env` local apartado (simulando el runner de CI): el `apiKey` queda incrustado en `dist/assets/cliente-*.js`.

**Archivos modificados:**

- `.env.production`
- `.gitignore`

## 2026:09:25 17:41 — Eliminar la configuración muerta de App Hosting

**Resumen:** tras migrar el despliegue a Firebase Hosting y eliminar el backend de App Hosting (que fallaba esperando un servidor en `PORT=8080`), se elimina `apphosting.yaml` del repo por quedar sin uso. El `.npmrc` y su expansión del token se conservan porque siguen haciendo falta para instalar `@ai27-tech/ui` en el build local y en CI.

**Cambios:**

- Se eliminó `apphosting.yaml` (config del backend de App Hosting, ya borrado).

**Archivos modificados:**

- `apphosting.yaml` (eliminado)
## 2026:09:25 17:43 — CI/CD: despliegue automático a Firebase Hosting

**Resumen:** se agregó un workflow de GitHub Actions que compila y despliega el panel a Firebase Hosting (canal live) en cada push a `pf-wfap-m`, recuperando el despliegue automático que tenía App Hosting pero por la vía estática correcta. Usa la acción oficial `FirebaseExtended/action-hosting-deploy` con una cuenta de servicio guardada en el secreto `FIREBASE_SERVICE_ACCOUNT`. De paso se corrigió el workflow de CI, cuyo `pnpm install` también necesitaba `PNPM_CONFIG_NPMRC_AUTH_FILE` para autenticar contra GitHub Packages con pnpm 12.3.4.

**Cambios:**

- Se creó `.github/workflows/deploy.yml`: install (con auth de GitHub Packages) → build → deploy a Hosting canal live del proyecto `custodio-906e7268`.
- Se agregó `PNPM_CONFIG_NPMRC_AUTH_FILE=.npmrc` al paso de instalación de `.github/workflows/ci.yml`.

**Archivos modificados:**

- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`

## 2026:09:25 17:34 — Migrar el despliegue a Firebase Hosting (SPA estática)

**Resumen:** el build de App Hosting ya compilaba, pero el rollout fallaba porque el contenedor no escuchaba en `PORT=8080`: el panel es una SPA de Vite sin servidor, y App Hosting (pensado para Angular/Next.js) esperaba un proceso servidor. Como el panel es 100% cliente, se migró el despliegue a Firebase Hosting, que sirve archivos estáticos desde CDN sin contenedor. Se agregó el bloque `hosting` a `firebase.json` con `public: dist` y un rewrite de SPA (todas las rutas → `/index.html`) para que el enrutado en cliente de TanStack Router resuelva los enlaces profundos.

**Cambios:**

- Se agregó el bloque `hosting` a `firebase.json`: `public: "dist"`, `ignore` estándar y rewrite `**` → `/index.html`.

**Verificación:** build local con pnpm 12.3.4 correcto; probado con el emulador de Hosting: `/` y rutas profundas como `/viajes/abc123` devuelven `index.html` (200), y los assets se sirven como archivo con su MIME correcto.

**Archivos modificados:**

- `firebase.json`

## 2026:09:25 17:30 — Causa raíz del 401 en el build: pnpm ignora ${VAR} en el .npmrc

**Resumen:** se identificó y corrigió la verdadera causa del `401 Unauthorized` al instalar `@ai27-tech/ui` en el build de App Hosting. Desde pnpm v11.5.3 (el repo usa 12.3.4), pnpm **no expande `${...}` en las líneas de credencial del `.npmrc` del proyecto** por seguridad (GHSA-3qhv-2rgh-x77r), así que el token se ignoraba en silencio y la petición viajaba sin autenticación. Se agregó la variable `PNPM_CONFIG_NPMRC_AUTH_FILE=.npmrc` en `apphosting.yaml`, que indica a pnpm que trate el `.npmrc` del repo como archivo de auth de confianza y vuelva a expandir el token. Verificado localmente con pnpm 12.3.4: sin la variable el install da 401; con ella instala correctamente.

**Cambios:**

- Se agregó `PNPM_CONFIG_NPMRC_AUTH_FILE=.npmrc` (availability BUILD) en `apphosting.yaml`.
- Se revirtieron las líneas `always-auth` del `.npmrc` (no aplicaban a este problema); el archivo vuelve a su forma mínima con la expansión de `${GH_PACKAGES_TOKEN}`.

**Archivos modificados:**

- `apphosting.yaml`
- `.npmrc`

## 2026:09:25 17:11 — Forzar always-auth en la descarga de GitHub Packages

**Resumen:** tras resolver el secreto, el build de App Hosting seguía dando `401 Unauthorized` al instalar `@ai27-tech/ui`. La causa: pnpm enviaba el token en la petición de metadata pero no en la descarga del tarball (`npm.pkg.github.com/download/...`). Se agregó `always-auth=true` al `.npmrc` para forzar el token en todas las peticiones al host. Se verificó instalando el paquete con el token real (descarga del tarball incluida).

**Cambios:**

- Se agregaron `//npm.pkg.github.com/:always-auth=true` y `always-auth=true` al `.npmrc` versionado.

**Archivos modificados:**

- `.npmrc`

## 2026:09:25 16:49 — Acceso a GitHub Packages en el build de Firebase App Hosting

**Resumen:** el despliegue en Firebase App Hosting fallaba con `401 Unauthorized` al instalar dependencias, porque el build en la nube no tenía credenciales para `@ai27-tech/ui` en GitHub Packages. Se agregó un `.npmrc` versionado sin token (lee la credencial de la variable de entorno `GH_PACKAGES_TOKEN`), un `apphosting.yaml` que inyecta esa variable desde Secret Manager durante el build, y se alineó el workflow de CI al mismo esquema.

**Cambios:**

- Se creó `apphosting.yaml` con la configuración de App Hosting: expone `GH_PACKAGES_TOKEN` (desde el secreto homónimo en Secret Manager) como variable de entorno disponible en el build.
- Se creó un `.npmrc` versionado que apunta el scope `@ai27-tech` a `https://npm.pkg.github.com` y lee el token de `${GH_PACKAGES_TOKEN}`. No contiene el token literal, por eso es seguro versionarlo.
- Se ajustó `.gitignore` para forzar la inclusión del `.npmrc` versionado (`.npmrc` seguido de `!.npmrc`), manteniendo la protección contra un token literal.
- Se simplificó el workflow de CI: en lugar de construir el `.npmrc` a mano, `pnpm install` recibe `GH_PACKAGES_TOKEN` como variable de entorno y usa el `.npmrc` del repo.

**Archivos modificados:**

- `apphosting.yaml`
- `.npmrc`
- `.gitignore`
- `.github/workflows/ci.yml`

## 2026:09:25 16:27 — Correcciones de UI (rama `chore/ui-bugs`)

**Resumen:** dos correcciones de interfaz. La pestaña «Viajes» del menú lateral se apagaba al entrar al detalle de un viaje, y el visor de la galería abría el archivo equivocado cuando había más de una página de resultados. La rama corrige ambos y deja el archivo de la galería con el formato de Prettier.

**Cambios — shell (`src/app/shell/AppShell.tsx`):**

- El resaltado del ítem activo del `Sidebar` pasa de `matchRoute({ to })` a `matchRoute({ to, fuzzy: true })`. Con el match exacto, «Viajes» se apagaba al navegar a la subruta de detalle `/viajes/$id`; el match difuso lo mantiene activo también en las subrutas. Es seguro porque ningún destino del nav es prefijo de otro (sólo `/viajes` tiene hijos), así que no se encienden dos pestañas a la vez.

**Cambios — galería (`src/features/galeria/GaleriaSection.tsx`):**

- Se corrigió el archivo que abría el `Visor`. El estado abierto se rastreaba por índice de la página (`openIndex = inicioGrid + index`), pero el `Visor` recibe el arreglo completo de `medios`, no la porción paginada; a partir de la segunda página, el índice apuntaba al medio equivocado. Ahora el estado guarda el **id** del medio (`openMedioId`) y el `initialIndex` del `Visor` se calcula buscando ese id en el arreglo completo (`initialVisibleIndex`). El mismo arreglo aplica a la apertura desde la vista de cuadrícula (`ImageCard.onClick`) y desde la vista de lista (`Table.onRowClick`), que antes también dependían del índice paginado.
- Sin cambios de comportamiento en el resto del componente; el `chore: format check` que acompaña a la rama sólo reaplicó Prettier sobre este archivo (imports multilínea, JSX y espacios en blanco).

**Archivos modificados:**

- `src/app/shell/AppShell.tsx`
- `src/features/galeria/GaleriaSection.tsx`
- `CHANGELOG.md`

## 2026:09:25 12:20 — Limpieza de UI (rama `chore/app-cleanup`)

**Resumen:** limpieza de la interfaz sobre elementos que aún no tenían función real. Se retiran del shell la barra de búsqueda y el botón de notificaciones, se hace colapsable la barra lateral, los rótulos de los filtros de viajes pasan de la estética monoespaciada en versalitas a etiquetas legibles, y el teléfono del custodio se muestra agrupado en el expediente mediante un nuevo formateador.

**Cambios — shell (`src/app/shell/AppShell.tsx`):**

- Se eliminó el `Input` de búsqueda («Buscar viajes, folios…») que ocupaba el `brand` del `Navbar` y el botón de `Notificaciones` (`Bell`); las importaciones de `Input`, `Bell` y `Search` se retiraron al quedar sin uso. El `Navbar` conserva sólo el botón de cuenta de usuario en `actions`.
- La `Sidebar` ahora es colapsable: nuevo estado `colapsada`, con `collapsed` y `onToggleCollapse`; al colapsar se oculta el encabezado «AI27» (`header` pasa a `undefined`).

**Cambios — filtros de viajes (`src/features/viajes/ViajesFilters.tsx`):**

- Los rótulos de los seis `FormField` dejan de usar el componente `RotuloFiltro` (monoespaciado, versalitas, `tracking-widest`) y pasan a etiquetas de texto simples: `FECHA [PERIODO]` → «Periodo», `DESDE` → «Desde», `HASTA` → «Hasta», `PLACA [UNIDAD]` → «Placa», `CUSTODIO [AGENTE]` → «Custodio», `ETIQUETA [TAG]` → «Etiqueta», `NOVEDAD [STATUS]` → «Novedad». Se eliminó el helper `RotuloFiltro`, ya sin uso.

**Cambios — expediente (`src/features/expediente/ExpedienteResumenCards.tsx`):**

- El teléfono del custodio se muestra agrupado con el nuevo `formatearTelefono` tanto en el valor de respaldo (cuando no hay `custodioName`) como en el contexto de la tarjeta.
- La tarjeta de archivos registrados dejó de mostrar el contexto «de {mediosEsperados} esperados»; ahora presenta sólo el conteo de archivos subidos.
- `ExpedienteResumenCards.test.tsx`: se ajustaron dos pruebas para esperar el teléfono agrupado (`+52 (556) 332 9999`) y para verificar que ya no aparece el texto «esperados».

**Cambios — formato (`src/lib/formato/telefono.ts`, nuevo):**

- `formatearTelefono(valor)`: agrupa un E.164 mexicano como `+XX (XXX) XXX XXXX` (código de país + nacional en 3-3-4). Es puramente cosmético: devuelve la cadena vacía para valores nulos o vacíos, y respeta tal cual cualquier valor que no empiece con `+` o cuya longitud no sea la esperada (12 dígitos), para no mutilar el dato.
- `telefono.test.ts` (nuevo): cubre el agrupado del E.164 mexicano, la normalización de separadores previos, los valores vacíos/nulos, y el respeto de valores sin prefijo `+` o de longitud atípica.

**Archivos modificados:**

- `src/app/shell/AppShell.tsx`
- `src/features/viajes/ViajesFilters.tsx`
- `src/features/expediente/ExpedienteResumenCards.tsx`
- `src/features/expediente/ExpedienteResumenCards.test.tsx`
- `src/lib/formato/telefono.ts`
- `src/lib/formato/telefono.test.ts`
- `CHANGELOG.md`

## 2026:09:23 18:00 — Integración con Firebase y corrección del contrato

**Resumen:** la capa de datos deja de leer campos que el productor no escribe y conecta las agregaciones reales del reporte. Se alinea el contrato con `pf-app-custodio` §5.1 verificado contra documentos reales, se corrige el modelo de autorización documentado (allowlist de correo, no custom claim) y se declaran los índices compuestos en `pf-infra-firebase`.

**Cambios — frontera de datos (`src/lib/datos/`):**

- `tipos.ts`: `Viaje.custodioCorreo` → `custodioTelefono` (E.164; el custodio se identifica por teléfono, no por correo). `Medio.etiqueta: string` → `etiquetas: string[]` (el contrato lleva un array). Nuevo helper `etiquetaVisible(medio)` (primera etiqueta o «Sin etiqueta»). `Etiqueta` gana `categoria?: 'SITUACION' | 'EVIDENCIA'`.
- `custodios.ts` (nuevo): `obtenerCustodios(uids)` y `enriquecerConNombres(viajes)` resuelven el **nombre** del custodio desde `usuarios/{uid}.nombre` (el reporte no lo trae), con deduplicado, en paralelo y con respaldo al teléfono. Se aplica en `listarViajesFirestore` y `obtenerViajeFirestore`.
- `viajesFirestore.ts`: mapea `custodioTelefono`; nuevo `conteoDeMedios(d)` que trata `resumenMedios` como **snapshot de cierre** (viaje `ACTIVO` → `fotos = mediosSubidos`, `audios = 0`; cerrado/descartado → `resumenMedios`).
- `medios.ts`: mapea `etiquetas` como array; el filtro de galería pasa a `where('etiquetas', 'array-contains', …)`.
- `catalogos.ts`: lee el documento único `catalogos/etiquetas` y mapea su array `valores` (`[{ id, nombre, categoria, orden, activo }]`), en vez de la colección provisional `catalogos_etiquetas`. Nuevo `mapearValores` puro.
- `metricasFirestore.ts` (nuevo): agregaciones reales del reporte. Cabecera con `getCountFromServer` (viajes, incidencias, evidencias fotográficas por `count` sobre `medios` tipo FOTO, efectividad), gráficas no agregables por lectura acotada (`descartesPorMotivo`, `capturasPorHora`, `gbAcumulados`), y `gigabytesAcumulados` con `sum(sizeBytes)`. `metricas.ts` conmuta a esta rama (import diferido) cuando `VITE_DATOS_MOCK` es false.

**Cambios — UI (consumen `etiquetaVisible`/`custodioTelefono`):** `Visor.tsx`, `Miniatura.tsx`, `GaleriaSection.tsx`, `ExpedienteGaleria.tsx`, `ViajeCard.tsx`, `ExpedienteResumenCards.tsx`, y los `provisional.ts` de galería y expediente.

**Cambios — infraestructura (`pf-infra-firebase`):** nuevo `firestore.indexes.json` con 10 índices compuestos para las consultas del panel, referenciado desde `firebase.json`. `test/reglas.test.js` gana dos regresiones de la allowlist (un correo fuera de `config/analistas.correos` no lee ni consulta).

**Cambios — documentación:** `docs/PLAN.md` §5/§6/§9 y `README.md` corregidos: `custodioTelefono`, `etiquetas` array, `resumenMedios` como snapshot, autorización por correo (no custom claim), e índices en `pf-infra-firebase`. `.env.example` describe el web appId y el modelo de allowlist.

**Verificación:** `pnpm typecheck`, `pnpm lint`, `pnpm build` y `pnpm test` (13 archivos, 64 pruebas) en verde. Las pruebas de reglas del emulador y el despliegue de índices quedan para CI/entorno con Java y credenciales del proyecto.

## 2026:09:23 13:19

**Resumen:** Pantalla de Expediente de un viaje (rama `feat/single-viaje-implementation`): la ruta `/viajes/$id` deja de ser inexistente y monta la vista real del expediente —cabecera con estados y exportación a PDF, cuatro tarjetas de resumen y la galería de evidencias agrupada por etiqueta—. La lista de viajes se movió a la ruta índice para dejar sitio al detalle, y el diseño de tarjeta del reporte se extrajo a un componente compartido que ahora usan reporte y expediente.

**Cambios — ruteo:**

- `src/routes/_privado/viajes.tsx` → `src/routes/_privado/viajes.index.tsx` (renombrado): `Pantalla_Viajes` pasa a ser la ruta índice `/_privado/viajes/` para convivir con la ruta de detalle. Sin cambios de comportamiento salvo que `onAbrirViaje` ahora **navega** a `/viajes/$id` con `useNavigate` en vez de sólo registrar en consola, ya que el destino ya existe.
- `src/routes/_privado/viajes.$id.tsx` (nuevo): `Pantalla_Expediente`. Lee `id` de los parámetros, consulta el viaje con `useQuery(['viaje', id], obtenerViaje)` y sus medios con `useQuery(['medios', id], …)`, esta última habilitada sólo cuando el viaje resolvió. Mientras el corpus real esté vacío o la lectura falle, la consulta de medios cae a `MEDIOS_MUESTRA_EXPEDIENTE`. Estados: esqueleto al cargar; tarjeta de error con enlace «Volver a viajes» cuando la consulta falla o el viaje es `null` (con textos distintos para «no encontrado» y «no se pudo cargar»); y `ExpedienteDetalle` con datos.

**Cambios — expediente (`src/features/expediente/`):**

- `ExpedienteDetalle.tsx` (nuevo): compone la pantalla presentacional —`ExpedienteHeader`, `ExpedienteResumenCards` y `ExpedienteGaleria`— recibiendo viaje y medios ya resueltos por props, con el cuerpo desplazable de altura acotada.
- `ExpedienteHeader.tsx` (nuevo): cabecera con breadcrumb hacia `/viajes`, las `placas` en monoespaciada, un `Badge` por cada `EstadoOperativo` (vía `presentacionDeEstado`, sin decidir color) y el botón «Exportar reporte PDF» que dispara `window.print()` —el PDF del expediente es la vista impresa, sin librería (docs/PLAN.md §8)—.
- `ExpedienteResumenCards.tsx` (nuevo): las cuatro tarjetas del expediente (fecha de registro con indicador En progreso/Cerrado, custodio asignado con respaldo `custodioName ?? custodioCorreo`, archivos registrados sobre `mediosEsperados`, y duración del viaje), todas sobre `TarjetaResumen` y usando sólo campos reales de `Viaje`.
- `ExpedienteGaleria.tsx` (nuevo): agrupa los medios por `etiqueta` y los presenta con `ImageCarousel`/`ImageCard` de `@ai27-tech/ui`, una sección por grupo con conteo real de evidencias, y abre cada archivo en el `Visor`. Las miniaturas de muestra usan el SVG local determinista; las reales resuelven `urlMiniatura`.
- `ExpedienteDetalleSkeleton.tsx` (nuevo): esqueleto de carga del expediente completo, para que la pantalla no salte al resolver la consulta.
- `provisional.ts` (nuevo): `MEDIOS_MUESTRA_EXPEDIENTE`, evidencias de muestra agrupadas en tres secciones (inspección de origen, incidencias en ruta, llegada y cotejo) como la maqueta, deterministas y sin red. Se borra cuando el expediente consuma medios reales.
- `ExpedienteGaleria.test.tsx`, `ExpedienteHeader.test.tsx`, `ExpedienteResumenCards.test.tsx` (nuevos): pruebas de agrupación/estado vacío de la galería, del breadcrumb/estados/acción de impresión de la cabecera, y del contenido de las cuatro tarjetas de resumen.

**Cambios — componente compartido y utilidades:**

- `src/components/TarjetaResumen.tsx` (nuevo) y `src/components/TarjetaResumen.test.tsx` (nuevo): el diseño de tarjeta que nació en la cabecera del reporte, extraído para compartirse entre reporte y expediente (rótulo en versalitas, ícono, valor con `tamanoValor` `grande`/`medio`, `contexto` y `delta` opcional con color por favorabilidad e `invertirColorDelta`). Sobre la `Card` de la librería.
- `src/features/reporte/TarjetaEstadistica.tsx`: se reescribió como adaptador delgado que traduce una `Estadistica` a las props de `TarjetaResumen`, en vez de dibujar la tarjeta a mano; el marcado y el formateo del delta se movieron al componente compartido.
- `src/lib/formato/fechas.ts`: se agregó `duracionEntre(inicio, fin, ahora?)`, que devuelve la duración como `HHh MMm` (o `MMm` si dura menos de una hora) y mide contra `ahora` cuando el viaje sigue abierto. Alimenta la tarjeta de duración del expediente.
- `src/features/galeria/provisional.ts`: se agregó `idCortoDe(medio)`, el sello hexadecimal corto y estable de la maqueta (`#4a8b9c1`) derivado del id con el mismo hash determinista, que la galería del expediente muestra bajo cada miniatura.

**Archivos modificados:**

- `src/routes/_privado/viajes.index.tsx` (renombrado desde `viajes.tsx`)
- `src/routes/_privado/viajes.$id.tsx`
- `src/features/expediente/ExpedienteDetalle.tsx`
- `src/features/expediente/ExpedienteDetalleSkeleton.tsx`
- `src/features/expediente/ExpedienteHeader.tsx`
- `src/features/expediente/ExpedienteHeader.test.tsx`
- `src/features/expediente/ExpedienteResumenCards.tsx`
- `src/features/expediente/ExpedienteResumenCards.test.tsx`
- `src/features/expediente/ExpedienteGaleria.tsx`
- `src/features/expediente/ExpedienteGaleria.test.tsx`
- `src/features/expediente/provisional.ts`
- `src/components/TarjetaResumen.tsx`
- `src/components/TarjetaResumen.test.tsx`
- `src/features/reporte/TarjetaEstadistica.tsx`
- `src/lib/formato/fechas.ts`
- `src/features/galeria/provisional.ts`
- `CHANGELOG.md`

## 2026:09:23 10:57

**Resumen:** Actualización de `@ai27-tech/ui` de `0.2.0-beta.1` a `0.2.0-beta.2`, que trae los componentes usados por el expediente (`ImageCarousel`, `ImageCard`, `Visor`).

**Cambios:**

- `package.json`: se subió `@ai27-tech/ui` de `0.2.0-beta.1` a `0.2.0-beta.2`.
- `pnpm-workspace.yaml`: se agregó `minimumReleaseAgeExclude` con `@ai27-tech/ui@0.2.0-beta.2`, para que la política de antigüedad mínima de publicación no bloquee la instalación de un beta recién publicado.
- `pnpm-lock.yaml`: se regeneró con la nueva versión.

**Archivos modificados:**

- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `CHANGELOG.md`

## 2026:09:22 17:42

**Resumen:** Pantalla de Reporte completa (rama `feat/report-section-implementation`): la ruta `/reporte` deja de ser marcador y monta la vista real con cabecera, selector de periodo, cuatro tarjetas de estadística y tres gráficas de recharts, todo sobre una nueva frontera de datos `lib/datos/metricas` con fuente mock, y con soporte de impresión a PDF desde el navegador.

**Cambios — frontera de datos:**

- `src/lib/datos/metricas.ts` (nuevo): la FRONTERA de las métricas, mismo patrón que `viajes.ts`. Expone `obtenerMetricas(periodo)` seleccionando fuente por `VITE_DATOS_MOCK` (hoy sólo existe el mock; la rama real de agregaciones de Firestore se conecta en F5, cuando las reglas autoricen al analista) y `folioDePeriodo(periodo)`, que deriva el folio del corte (`EXP-2026-09-MX`, o `EXP-AAAA-MM_a_MM-MX` cuando el rango cruza meses). Define los tipos que consume la pantalla: `Estadistica` (`valor` ya formateado, `delta` como fracción o `null`, `contexto`), `EstadisticasReporte` (las cuatro tarjetas), `PuntoCategoria`/`PuntoSerie`, `GraficasReporte` (`descartesPorMotivo`, `capturasPorHora`, `gbAcumulados`) y `Metricas`. Deliberadamente sin métricas de volumen ni rankings de custodios por cantidad de fotos (`docs/PLAN.md` §8).
- `src/lib/datos/metricasMock.ts` (nuevo): implementación estática que calcula las mismas cifras sobre datos de desarrollo, para que la pantalla funcione mientras F1 sigue cerrada.

**Cambios — pantalla y componentes (`src/features/reporte/`):**

- `ReporteSection.tsx` (nuevo): orquesta la pantalla siguiendo el patrón de Viajes. El periodo vive en estado (`SeleccionPeriodo`, inicial `{ atajo: 'mes' }`), se resuelve con `resolverPeriodo` y es la clave de `useQuery(['metricas', rango], …)`, así cada periodo se cachea por separado. Mapea `isPending`/`isError`/`isSuccess` a los estados de carga, error y vacío; el vacío se detecta cuando `viajesAuditados.valor === '0'` y ofrece ampliar el rango al mes. El bloque con datos se envuelve en `.reporte-imprimible`.
- `ReporteHeader.tsx` (nuevo): cabecera con título, `Badge` «AI27 FORENSIC AUDIT», el folio en pastilla monoespaciada, subtítulo, el `SelectorPeriodo` y un botón Imprimir (`onImprimir ?? window.print`). La fila de controles lleva `no-imprimir` para no salir en el PDF.
- `SelectorPeriodo.tsx` (nuevo): grupo de atajos Hoy/Semana/Mes/Rango con `aria-pressed`; al elegir Rango aparecen dos `input type="date"` con validación por `esRangoValido` y aviso `role="alert"` cuando la fecha inicial es posterior a la final.
- `TarjetaEstadistica.tsx` (nuevo) y `TarjetasEstadistica.tsx` (nuevo): la tarjeta presentacional (valor grande, delta con signo y flecha, verde/rojo según favorabilidad, con `invertirColorDelta` para métricas donde subir es malo) y la fila de las cuatro tarjetas (viajes auditados, incidencias, evidencias fotográficas, efectividad de custodia) con sus iconos de lucide.
- `GraficasSection.tsx` (nuevo): banda «Operación y evidencia» que dispone `GraficaDescartes` y `GraficaCapturasPorHora` en dos columnas y `GraficaGbAcumulados` a lo ancho.
- `graficas/Graficas.tsx` (nuevo): las tres gráficas de recharts, cada una presentacional y con su propio estado vacío: descartes por motivo (barras horizontales), capturas por hora (línea sobre 24 h) y almacenamiento acumulado en GB (área con degradado).
- `graficas/PanelGrafica.tsx` (nuevo): marco común de una gráfica (título, subtítulo, `extra` opcional y cuerpo de alto fijo) sobre la `Card` de `@ai27-tech/ui`.
- `graficas/tema.ts` (nuevo): `COLORES` y `ESTILO_TOOLTIP` como cadenas `var(--…)` que recharts resuelve contra el DOM, para que el tema claro/oscuro se herede sin recalcular; no define ningún color propio.
- `estados.tsx` (nuevo): esqueletos de carga (tarjetas y gráficas), estado vacío (`ReporteVacio`) y estado de error (`ReporteError`), con el mismo encuadre que los estados de `ViajesList`.
- `SelectorPeriodo.test.tsx` y `TarjetaEstadistica.test.tsx` (nuevos): pruebas de los dos componentes con lógica propia —atajo activo, notificación de cambio, campos de Rango y aviso de rango inválido; y título/valor, formato del delta con color según favorabilidad y ausencia de delta sin periodo anterior.

**Cambios — ruta, estilos y dependencia:**

- `src/routes/_privado/reporte.tsx`: la ruta deja de renderizar `EncabezadoPagina` + `PorConstruir` y ahora monta `<ReporteSection />`.
- `src/styles/globales.css`: se amplió la hoja `@media print` para que el PDF abarque toda la información: se libera la altura/desbordes de `html`/`body`/`#root`/`main`, `.bloque-imprimible` evita cortes de página, la gráfica responsiva ocupa el 100 % y los SVG conservan sus colores (`print-color-adjust: exact`).
- `package.json`: se agregó `recharts` `^3.10.1` como dependencia (con su entrada en `pnpm-lock.yaml`).

**Archivos modificados:**

- `src/lib/datos/metricas.ts`
- `src/lib/datos/metricasMock.ts`
- `src/features/reporte/ReporteSection.tsx`
- `src/features/reporte/ReporteHeader.tsx`
- `src/features/reporte/SelectorPeriodo.tsx`
- `src/features/reporte/SelectorPeriodo.test.tsx`
- `src/features/reporte/TarjetaEstadistica.tsx`
- `src/features/reporte/TarjetaEstadistica.test.tsx`
- `src/features/reporte/TarjetasEstadistica.tsx`
- `src/features/reporte/GraficasSection.tsx`
- `src/features/reporte/estados.tsx`
- `src/features/reporte/graficas/Graficas.tsx`
- `src/features/reporte/graficas/PanelGrafica.tsx`
- `src/features/reporte/graficas/tema.ts`
- `src/routes/_privado/reporte.tsx`
- `src/styles/globales.css`
- `package.json`
- `pnpm-lock.yaml`
- `CHANGELOG.md`

## 2026:09:21 17:39

**Resumen:** Convenciones y documentación: registro de los sustantivos de dominio nuevos en el steering de nombres y corrección del README sobre el estado real de `@ai27-tech/ui`.

**Cambios:**

- `.kiro/steering/naming-conventions.md`: en §4 se agregaron `placas` a la lista de sustantivos de dominio canónicos, junto a `viaje`, `bitacora`, etc. En §6 se agregó `pf-web-frontend-analist-panel` a la lista de repos en el alcance de la convención, y el texto pasó de «los dos frontends» a «los tres frontends». El resto del archivo, incluida la excepción de los sustantivos de dominio y el criterio sobre inconsistencias existentes, quedó sin cambio.
- `README.md`: la sección «### 2. `@ai27-tech/ui` requiere acceso a GitHub Packages», que afirmaba que la librería no estaba en `package.json` y que el panel no tenía componentes prefabricados, ya no era cierta — `package.json` fija `@ai27-tech/ui` en `0.2.0-beta.1` y ya se construyeron componentes reales con ella (`Card`, `Badge`, `Select`, `Input`, `FormField`, `Pagination`, `Button`). Se reescribió como una sección propia «## `@ai27-tech/ui`» que declara la librería instalada y conserva la nota de que se publica en GitHub Packages y requiere un token con `read:packages` para instalarla o actualizarla. Como ese bloqueo quedó resuelto, la sección «## Dos cosas que hoy bloquean el uso real» pasó a «## Una cosa que hoy bloquea el uso real», dejando sólo el bloqueo de lectura de Firestore (fase F1), que no cambia. La sección `## Convenciones` no se tocó.

**Archivos modificados:**

- `.kiro/steering/naming-conventions.md`
- `README.md`
- `CHANGELOG.md`

## 2026:09:21 17:25

**Resumen:** Componentes de filtros (`FiltrosActivos.tsx`, `ViajesFilters.tsx`) y cableado de la pantalla (`Pantalla_Viajes` en `src/routes/_privado/viajes.tsx`).

**Cambios — filtros:**

- `src/features/viajes/FiltrosActivos.tsx` (nuevo): fila «FILTROS ACTIVOS:» con un chip `Badge pill` por criterio activo distinto del periodo (`placas`, `custodioName`, `etiqueta` —resuelto a su nombre buscando en `etiquetas` por `id`, o el id tal cual si no se encuentra—, `isUpdated`), cada uno con un botón de cierre (`Button variant="ghost" size="sm"`, `aria-label` que nombra el filtro) que llama `onQuitarFiltro(clave)`, y un control «Limpiar todo» al final. La fila completa se omite (`return null`) cuando no hay ningún criterio activo fuera del periodo. El periodo nunca aparece como chip.
- `src/features/viajes/ViajesFilters.tsx` (nuevo): Panel_Filtros. Componente controlado (`filtros` completo entra, `filtros` completo sale por `onFiltrosChange`), con estado local propio de `SeleccionPeriodo` inferido una sola vez al montar (comparando `filtros.desde`/`hasta` contra los tres atajos calculados para "ahora"; si no coincide con ninguno, se asume `{ atajo: 'rango', ... }`) y estado local del texto en vuelo de placas/custodio para el debounce de 300 ms. Cinco `FormField` con los rótulos exactos del diseño (`FECHA [PERIODO]`, `PLACA [UNIDAD]`, `CUSTODIO [AGENTE]`, `ETIQUETA [TAG]`, `NOVEDAD [STATUS]`): `Select` de periodo con cuatro opciones que resuelve y emite de inmediato para los tres atajos, o muestra dos `Input type="date"` para `'rango'` que validan con `esRangoValido` antes de emitir (si es inválido, ambos reciben `invalid` y no se emite, conservando el último rango válido); `Input` de placas y custodio con debounce y omisión de la clave cuando el campo queda vacío; `Select` de etiqueta con `''` → «Cualquier etiqueta» y una opción por cada elemento de la propiedad `etiquetas`; `Select` de novedad con la conversión a `boolean | undefined` en el manejador, no en el tipo. Se agregó un helper local `omitirClave` para quitar una clave de un objeto sin dejarla en `undefined` (`exactOptionalPropertyTypes` está activo en `tsconfig.app.json`) sin recurrir al patrón de desestructurar-para-descartar, que ESLint marca como variable sin uso bajo la configuración de este repo. Compone `FiltrosActivos` debajo de los controles; `onLimpiarTodo` restablece el periodo a `{ atajo: 'mes' }`, limpia los criterios sueltos y pone `page: 1` conservando `pageSize`. Sin el botón «+ Más filtros» y sin colores literales.
- Se verificaron las firmas reales de `Select`, `Input`, `FormField`, `Badge`, `Button`, `Card`/`CardBody` contra `node_modules/@ai27-tech/ui/dist/components/**/*.d.ts` antes de escribir ambos componentes.

**Cambios — cableado de la pantalla:**

- `src/routes/_privado/viajes.tsx` (reescrito): `Pantalla_Viajes` reemplaza a `PorConstruir`, conservando `<EncabezadoPagina titulo="Viajes" />`. Estado propio: `SeleccionPeriodo` (inicial `{ atajo: 'mes' }`), `criterios` (`placas`/`custodioName`/`etiqueta`/`isUpdated`, con spread condicional para respetar `exactOptionalPropertyTypes` al recibirlos de `ViajesFilters`), `page` (inicial 1) y `pageSize` (inicial 10). `filtros: FiltrosViaje` se deriva combinando `resolverPeriodo(periodo)` con `criterios`, `page` y `pageSize`, y es la clave completa de `useQuery(['viajes', filtros], () => listarViajes(filtros))`; `isPending`/`isError`/`refetch` se mapean a `estado: 'cargando' | 'error' | 'listo'` y a `onReintentar`. Un segundo `useQuery(['etiquetas'], listarEtiquetas)` alimenta la propiedad `etiquetas` de `ViajesFilters`. Cualquier cambio de filtro o de `pageSize` reinicia `page` a 1. `onAbrirViaje` sólo hace `console.info` con un comentario explícito de que la ruta de detalle no existe en esta entrega; no navega. Estructura raíz `<div className="flex h-full min-h-0 flex-col">` con `EncabezadoPagina` y un `<div className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6">` conteniendo `ViajesFilters` y `ViajesList`.

**Archivos modificados:**

- `src/features/viajes/FiltrosActivos.tsx`
- `src/features/viajes/ViajesFilters.tsx`
- `src/routes/_privado/viajes.tsx`
- `CHANGELOG.md`

## 2026:09:21 17:08

**Resumen:** Componentes de la lista: `ViajeCard.tsx`, `ViajesListSkeleton.tsx` y `ViajesList.tsx`.

**Cambios:**

- `src/features/viajes/ViajeCard.tsx` (nuevo): Renglon_Viaje. `Card variant="outlined"` de `@ai27-tech/ui` con `onClick`, que lo rinde como `button` enfocable con el teclado sin `tabIndex`/`onKeyDown` a mano. Mosaico con `Truck` de `lucide-react`; línea 1 con `placas` en `font-mono font-bold` y un `Badge` por cada elemento de `viaje.estados`, con `variant`/`dot`/`pulse`/etiqueta obtenidos de `presentacionDeEstado` (`./mapeoEstados`) — el componente no decide color; línea 2 con `Calendar` + `fechaHoraDeViaje(viaje.abiertoEn)`, `User` + «Custodio: {nombre}» (`custodioName ?? custodioCorreo`, R8.9), y `Files` + «{uploadedFiles} archivos» con `cifras-tabulares`; `ChevronRight` decorativo con `aria-hidden`. Sin tira de miniaturas ni paréntesis de detalle (fuera de alcance) y sin colores literales.
- `src/features/viajes/ViajesListSkeleton.tsx` (nuevo): `count` marcadores `bg-surface-high animate-pulse` con la altura aproximada de un `ViajeCard` real, para que la lista no salte al resolver la consulta (R11.1).
- `src/features/viajes/ViajesList.tsx` (nuevo): Lista_Viajes. Estructura de tres franjas (`<section className="flex min-h-0 flex-1 flex-col">` → header `shrink-0` con «EXPEDIENTES REGISTRADOS» + «Mostrando {n} de {total} viajes» en `Intl.NumberFormat('es-MX')`, `cifras-tabulares` y `aria-live="polite"` → `<ul ref className="min-h-0 flex-1 overflow-y-auto">` → pie `shrink-0 border-t` con `Pagination` de `@ai27-tech/ui`, `showInfo={false}`, `pageSizeOptions` implícito). Dentro del `<ul>`, según `estado`: `ViajesListSkeleton` al cargar; `SearchX` + texto con el periodo + botón «Limpiar filtros» en vacío; un `<li><ViajeCard /></li>` por viaje en listo; `AlertTriangle` + texto genérico + botón «Reintentar» en error. Un `useEffect` sobre `page` hace `scrollTo({ top: 0 })` en el nodo del `<ul>`, no en la ventana (R10.5).

**Archivos modificados:**

- `src/features/viajes/ViajeCard.tsx`
- `src/features/viajes/ViajesListSkeleton.tsx`
- `src/features/viajes/ViajesList.tsx`
- `CHANGELOG.md`

## 2026:09:21 16:57

**Resumen:** Layout de altura completa: sólo se agregó `shrink-0` al `<header>` de `EncabezadoPagina`. El resto del layout (altura acotada de `<main>`) ya lo resuelven `src/routes/_privado.tsx` y `src/app/shell/AppShell.tsx`, que no necesitan ningún cambio.

**Cambios:**

- `src/components/EncabezadoPagina.tsx`: se agregó `shrink-0` al `<header>` del componente `EncabezadoPagina`, para que no se comprima como primer hijo del `flex h-full min-h-0 flex-col` que fija el contenedor raíz de `Pantalla_Viajes`. El componente `PorConstruir`, en el mismo archivo, no se tocó: se verificó por lectura que su contenido quedó idéntico.
- **No se tocaron** `src/routes/_privado.tsx` ni `src/app/shell/AppShell.tsx`: `AppShell.tsx` ya tiene `<div className="flex h-screen">` como raíz y `<main className="min-w-0 flex-1 overflow-auto">`, dando a su contenido una altura acotada al 100% de la ventana. `_privado.tsx` sólo resuelve el guard de sesión y monta `AppShell`.
- **No se tocaron** las tres pantallas marcador (`galeria`, `reporte`, `ajustes`): no necesitan cambio en esta entrega.

**Archivos modificados:**

- `src/components/EncabezadoPagina.tsx`
- `CHANGELOG.md`

## 2026:09:21 16:44

**Resumen:** Nuevo módulo puro `mapeoEstados.ts` que traduce cada `EstadoOperativo` a la presentación de un `Badge` (rótulo, variante, punto, pulso). Es la primera pieza que crea algo en `src/features/viajes/`, que hasta ahora estaba vacío.

**Cambios:**

- `mapeoEstados.ts` (nuevo): `PresentacionEstado { etiqueta; variant; dot; pulse }` y `presentacionDeEstado(estado: EstadoOperativo | string): PresentacionEstado`, función pura sin React ni capa de datos. Se implementó la tabla de nueve renglones de `design.md` tal cual, con `variant: BadgeVariant` importado de `@ai27-tech/ui` (confirmado en `dist/index.d.ts`: `Badge`/`BadgeProps`/`BadgeVariant` se re-exportan desde la raíz del paquete). Cada renglón lleva su razón semántica en comentario (por qué `secure` en `activo` y `sellado_forense`, por qué `escort` en `en_ruta` y `sincronizacion_en_vivo`, etc.), y se documentaron los dos criterios que gobiernan la tabla completa: el pulso es escaso (sólo `alerta_desvio`, `sin_senal` y `sincronizacion_en_vivo` lo llevan, porque son los tres que ocurren mientras el analista mira) y el punto separa proceso (`activo`, `en_revision`, `sin_senal`, etc.) de resultado (`sellado_forense`, `sin_novedad`, `expedientes_registrados`). El respaldo de un valor fuera del catálogo devuelve `variant: 'neutral'`, sin punto ni pulso, con el rótulo igual al valor recibido, sin lanzar.

**Archivos modificados:**

- `src/features/viajes/mapeoEstados.ts`
- `CHANGELOG.md`

## 2026:09:21 16:31

**Resumen:** Capa de datos de viajes con dos fuentes seleccionables por `VITE_DATOS_MOCK` —Firestore y un arreglo estático de 24 viajes— más `catalogos.ts`/`catalogosMock.ts` para el catálogo de etiquetas con el mismo patrón.

**Cambios:**

- `viajesFirestore.ts` (nuevo): se movieron `aViaje`, `listarViajes` y `obtenerViaje` de `viajes.ts`, renombradas `listarViajesFirestore` y `obtenerViajeFirestore`. El mapper conserva la lectura de `d.hayNovedad` y `d.mediosSubidos` sin renombrarlos, con el comentario de que son del contrato de `pf-app-custodio` y este panel es sólo lectura. `estados: []` con el comentario `PENDIENTE (decisión D3)` y `etiquetas: d.etiquetas ?? []` con el comentario de la dependencia sobre el productor (decisión D8) se conservaron. `listarViajesFirestore` usa `limit(pageSize)`; se documentaron los cuatro límites conocidos de `design.md` §Riesgos, incluido que el `total` devuelto hoy es el conteo de la página traída y no el total real —eso exigiría `getCountFromServer`, que esta tarea no agrega— y que `page` no tiene efecto real porque Firestore pagina con cursores, no con desplazamiento.
- `viajesMock.ts` (nuevo): encabezado de archivo de desarrollo («ESTE ARCHIVO ES DE DESARROLLO. Se borra cuando la lista consuma Firestore.»). Arreglo `viajesEstaticos` con 24 viajes de fechas y valores literales, sin `Date.now()` ni aleatorios. Cobertura: al menos un viaje por cada uno de los nueve `EstadoOperativo`, un viaje (`viaje-11`) con dos estados a la vez, viajes con `isUpdated` verdadero y falso, un viaje (`viaje-04`) sin `custodioName` para ejercitar el respaldo al correo, viajes con varias etiquetas (`viaje-23` con tres) y viajes con `etiquetas: []`. Las etiquetas usadas —`salida`, `llegada`, `incidencia`, `documento`, `candado`— coinciden con los `id` del catálogo estático nuevo. `listarViajesMock` y `obtenerViajeMock` envuelven `queryViajes` y la búsqueda por id en una promesa resuelta, sin `setTimeout`.
- `vite-env.d.ts`: se agregó `readonly VITE_DATOS_MOCK?: string;` a `ImportMetaEnv`, junto a `VITE_USAR_EMULADORES`.
- `.env`: se agregó `VITE_DATOS_MOCK=true` con el mismo estilo de comentario «SOLO DESARROLLO» que ya usa `VITE_SALTAR_LOGIN` en ese archivo.
- `.env.example`: se agregó `VITE_DATOS_MOCK=false` (el valor conservador de ejemplo, siguiendo el patrón de `VITE_USAR_EMULADORES`).
- `viajes.ts`: reescrito como selector final de fuente. `usarMock = import.meta.env.VITE_DATOS_MOCK === 'true'`; `listarViajes` y `obtenerViaje` delegan en las implementaciones de `viajesFirestore.ts` o `viajesMock.ts` según ese flag. Ya no importa el SDK de Firebase directamente —eso ahora vive sólo en `viajesFirestore.ts`—; el archivo quedó corto: imports, la constante y las dos funciones. Se documentó que `VITE_DATOS_MOCK` mezcla español e inglés a propósito, por consistencia con `VITE_USAR_EMULADORES` y `VITE_SALTAR_LOGIN`, y que los tres se borran juntos cuando F1 cierre.
- `catalogosMock.ts` (nuevo): arreglo estático de `Etiqueta[]` con los mismos cinco identificadores usados en `viajesMock.ts`, ordenado por `orden` y filtrado por `activo`, con el mismo encabezado de archivo de desarrollo.
- `catalogos.ts` (nuevo): `listarEtiquetas()` selecciona por `VITE_DATOS_MOCK` igual que `viajes.ts`. La implementación de Firestore consulta una colección con nombre **provisional** `'catalogos_etiquetas'` —`docs/PLAN.md` §13.1 confirma que el catálogo real sigue pendiente de definición por Operación y no nombra la colección— filtrando por `activo` y ordenando por `orden`. Se anotó que por eso las opciones de etiqueta nunca se declaran dentro de un componente.

**Archivos modificados:**

- `src/lib/datos/viajesFirestore.ts`
- `src/lib/datos/viajesMock.ts`
- `src/lib/datos/viajes.ts`
- `src/lib/datos/catalogos.ts`
- `src/lib/datos/catalogosMock.ts`
- `src/vite-env.d.ts`
- `CHANGELOG.md`

## 2026:09:21 16:17

**Resumen:** `src/lib/formato/fechas.ts` gana `SeleccionPeriodo`, `resolverPeriodo`, `esRangoValido` y `fechaHoraDeViaje`, sin tocar `fechaLocalDe` ni `rangoDeAtajo`.

**Cambios:**

- `fechas.ts`: se agregó `SeleccionPeriodo` como unión `{ atajo: Atajo } | { atajo: 'rango'; desde; hasta }`. `'rango'` vive únicamente en esta unión nueva y no se agregó a `Atajo`: un rango explícito no se calcula a partir de "ahora" y meterlo en el `switch` de `rangoDeAtajo` habría exigido un valor de retorno para un caso que no aplica ahí.
- `fechas.ts`: se agregó `resolverPeriodo(seleccion, ahora?)`. Los tres atajos delegan tal cual en `rangoDeAtajo`, sin repetir su lógica; `'rango'` devuelve `{ desde, hasta }` exactamente como llegaron, ignorando `ahora` por completo.
- `fechas.ts`: se agregó `esRangoValido(desde, hasta)` con comparación lexicográfica `desde <= hasta`, documentado con el mismo razonamiento que ya usa `queryViajes` para el rango de fechas: el formato `YYYY-MM-DD` es de ancho fijo y de mayor a menor significancia, así que el orden de cadenas coincide con el orden cronológico.
- `fechas.ts`: se agregó `fechaHoraDeViaje(instante)` con el formato `24 Oct 2024, 08:30 hrs`, zona fijada a `America/Mexico_City` y hora de 24 horas. Se armó a mano con `formatToParts` y una tabla de doce rótulos abreviados en vez de un solo `Intl.DateTimeFormat` con `month: 'short'`, porque `es-MX` da el mes en minúscula y sin punto ("oct") y no hay opción de `Intl` que capitalice la inicial; se pidió el mes como `'numeric'` para poder indexar la tabla ya capitalizada. Se normalizó también el caso de `hour: '24'` que algunos motores ICU devuelven para la medianoche con `hour12: false`, para no romper el patrón `HH` de dos dígitos.
- `fechas.ts`: se conservaron intactas `rangoDeAtajo`, `Atajo` y `fechaLocalDe`; el archivo sólo creció al final.

**Archivos modificados:**

- `src/lib/formato/fechas.ts`
- `CHANGELOG.md`

## 2026:09:21 14:52

**Resumen:** Lógica pura de consulta de viajes —rango de fechas, igualdades, pertenencia, coincidencia parcial de texto, orden y corte de la página.

**Cambios:**

- `viajesQuery.ts` (nuevo): `normalizar(texto)` con `normalize('NFD')` + `replace(/\p{Diacritic}/gu, '')` + `toLocaleLowerCase('es-MX')`. Queda documentado por qué se usa la clase Unicode y no el rango `\u0300-\u036f` —el rango es sólo el bloque «Combining Diacritical Marks» y deja fuera las marcas de los bloques de extensión, así que un diacrítico de otro bloque sobreviviría a la limpieza— y por qué `ñ` → `n` es el comportamiento deseado para buscar y no un daño colateral.
- `viajesQuery.ts`: `queryViajes(viajes, filtros)` en cuatro pasos. Rango de fechas comparando las cadenas `YYYY-MM-DD` directamente, con la nota de que la comparación lexicográfica basta por ser un formato de ancho fijo y de mayor a menor significancia, y de que comparar `Date` reintroduciría la zona horaria que `fechaLocal` existe para eliminar. Igualdad de `custodioUid`, **pertenencia** de `etiqueta` con `includes` sobre `viaje.etiquetas` (decisión D8, no igualdad) e `isUpdated` comparado con `===` y no por veracidad, porque `false` es un filtro y no una ausencia. Coincidencia parcial normalizada de `placas` y `custodioName`. Orden por `fechaLocal` descendente con `id` ascendente de desempate, `total` tomado antes del corte y página por `slice`.
- `viajesQuery.ts`: se decidió y documentó que un `custodioName` ausente **no** coincide con ningún criterio de nombre. El campo es opcional porque el catálogo de custodios todavía no existe, y quien escribe «morales» pide los viajes de esa persona, no los de aquellos de los que no se sabe quién es; incluirlos convertiría el filtro en un «morales o desconocido» que el control no ofrece.
- `viajesQuery.ts`: un criterio de texto vacío cuenta como ausencia de criterio, que es lo que emite un campo en blanco y lo que emite la primera opción de los `Select` («Cualquier etiqueta»). El módulo no importa `firebase/*` ni React, y ordena sobre una copia para no mutar el arreglo del llamador.
- `CHANGELOG.md`: se reordenaron las entradas de `14:22` y `14:38` para que el archivo cumpla el orden de más reciente primero que declara su encabezado. Las dos marcas de tiempo se conservan tal como se registraron, así que la entrada de `14:22` queda debajo de la de la decisión D8 (`14:38`) aunque el trabajo se hizo después: el reloj de la máquina va atrasado y por eso la marca de tiempo no refleja el orden real. Por la misma razón el bloque de entradas fechadas `2026:09:22` sigue más abajo, sin reescribir marcas históricas.

**Archivos modificados:**

- `src/lib/datos/viajesQuery.ts`
- `CHANGELOG.md`

## 2026:09:21 14:22

**Resumen:** Los tipos del panel ya expresan lo que la pantalla de lista de viajes necesita —estados operativos, etiquetas desnormalizadas, nombre del custodio y paginación— y el mapper de Firestore traduce los nombres del contrato a los del panel.

**Cambios:**

- `tipos.ts`: se agregó `EstadoOperativo`, unión literal cerrada de los nueve valores en `snake_case`, con el comentario de por qué conserva su forma en español (`estado` es término ubicuo del steering §4) y de que no se traduce a `OperationalStatus`.
- `tipos.ts`: se agregó `ViajesPage { viajes; total }`, que es lo que la paginación necesita para saber cuántas páginas hay.
- `tipos.ts`: en `Viaje` se agregaron `custodioName?` (opcional, porque el catálogo de custodios no existe y el renglón cae al correo), `estados: EstadoOperativo[]` (decisión D3: varios a la vez, sin grupos excluyentes) y `etiquetas: string[]` (decisión D8: desnormalizado, no opcional, porque el criterio de filtro se resuelve por pertenencia y no por igualdad).
- `tipos.ts`: se renombró `hayNovedad` → `isUpdated` y `mediosSubidos` → `uploadedFiles`, cada uno con el comentario de por qué el nombre va en inglés y de cómo se llama el campo en Firestore. Los otros doce campos de `Viaje` y el nombre del tipo `FiltrosViaje` se conservan: es la deuda registrada en `requirements.md` §«Deuda de nombres aceptada».
- `tipos.ts`: en `FiltrosViaje` se agregaron `custodioName?`, `etiqueta?` y `page`/`pageSize` obligatorios, y se quitó `limite`. La paginación es obligatoria para que no exista un llamado sin ella que devuelva la colección entera por descuido.
- `viajes.ts`: ajuste mínimo para que el repo siga compilando. `aViaje` traduce `d.hayNovedad` → `isUpdated` y `d.mediosSubidos` → `uploadedFiles` —los nombres del contrato de `pf-app-custodio` no se renombran, y este mapper es el único lugar donde conviven ambos vocabularios—, lee `custodioName` con respaldo a `undefined`, devuelve `estados: []` con la nota de la decisión D3 pendiente y `etiquetas: d.etiquetas ?? []` con la nota de que depende de que el productor lo escriba.
- `viajes.ts`: `listarViajes` usa `filtros.isUpdated` donde usaba `hayNovedad` y `filtros.pageSize` donde usaba `limite`. El reparto en `viajesFirestore.ts` / `viajesMock.ts` / `viajesQuery.ts` no se adelantó.

**Archivos modificados:**

- `src/lib/datos/tipos.ts`
- `src/lib/datos/viajes.ts`
- `CHANGELOG.md`

## 2026:09:22 01:10

**Resumen:** Se implementó el visor —zoom, desplazamiento, rotación, ajustar a pantalla y navegación por teclado— y se normalizaron los identificadores técnicos a inglés según `.kiro/steering/naming-conventions.md`. Los sustantivos de dominio (`Visor`, `Medio`, `medios`) y la prosa/UI se mantienen en español.

**Cambios:**

- Se construyó el visor (`src/features/visor/Visor.tsx`): superposición a pantalla completa con zoom (rueda y botones), desplazamiento arrastrando, rotación de 90°, ajustar a pantalla y atajos de teclado (← → navegan, +/− zoom, r rota, 0 reinicia, Esc cierra). Los controles usan el `Button` de `@ai27-tech/ui` y los tokens de la librería.
- La barra de controles flotante sigue el patrón del mockup: alejar / porcentaje / acercar · rotar izquierda / derecha · ajustar a pantalla.
- Se normalizaron los identificadores técnicos a inglés: en `Visor.tsx` (`Transform`, `INITIAL_TRANSFORM`, `zoom`/`offsetX`/`offsetY`/`rotation`, `changeZoom`, `rotate`, `reset`, `previous`/`next`, `resolveUrl`, `dragging`, `canvasRef`, `onKeyDown`, `onWheel`, `onMouseDown/Move`, `endDrag`, las props `initialIndex`/`onClose`/`resolveUrl`); en la ruta de dev (`VisorTestbed`, `open`/`setOpen`); y en el degradado de sesión de `lib/firebase/cliente.ts` (`resolve`, `unsubscribe`, `user`).
- Se renombró `src/features/visor/datosDePrueba.ts` a `sampleData.ts`, con export `sampleMedios` y helper `svgImage`. El sustantivo de dominio `medios` se conserva; el resto va en inglés. Los textos de los datos (rótulos, folios) y los comentarios se mantienen en español.
- Verificado: `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

**Archivos modificados:**

- `src/features/visor/Visor.tsx`
- `src/features/visor/sampleData.ts` (renombrado desde `datosDePrueba.ts`)
- `src/routes/_dev/visor.tsx`
- `src/lib/firebase/cliente.ts`
- `CHANGELOG.md`

## 2026:09:22 00:20

**Resumen:** Los tokens de la capa de estilos del panel pasan a nombres en inglés, alineados con el vocabulario de `@ai27-tech/ui`. Los sustantivos de dominio siguen en español; los nombres de tokens de UI no son dominio, así que van en inglés según la convención del workspace.

**Cambios:**

- Se renombraron los alias de color y radio de `src/styles/globales.css` a inglés espejeando la librería: `lienzo→canvas`, `superficie→surface` (con `-low`, `-high`, `-highest`), `borde→border` (`-strong`), `texto→text` (`-muted`, `-placeholder`), `acento→accent`, `exito→success`, `alerta→warning`, `peligro→danger`. Siguen siendo `var(--ui-*)`: la librería continúa siendo la única fuente de verdad.
- Se agregó el token `--color-on-accent: var(--ui-color-on-primary)` y se usó en el botón del login (`text-on-accent`), eliminando el hex `#0e1117` que estaba hardcodeado.
- Se actualizaron las clases Tailwind en los tres archivos que las usaban: `src/routes/_privado.tsx`, `src/routes/login.tsx` y `src/components/EncabezadoPagina.tsx`.
- Los comentarios de `globales.css` permanecen en español (prosa, no identificadores), según la convención del repo.
- Verificado: `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

**Archivos modificados:**

- `src/styles/globales.css`
- `src/routes/_privado.tsx`
- `src/routes/login.tsx`
- `src/components/EncabezadoPagina.tsx`
- `CHANGELOG.md`

## 2026:09:22 00:00

**Resumen:** `@ai27-tech/ui` pasa a ser la única fuente de verdad de la paleta. El panel deja de duplicar los valores de Nocturne y ahora los consume de la librería.

**Cambios:**

- Se importa `@ai27-tech/ui/styles.css` en `src/main.tsx`, antes de `globales.css`: trae los tokens `--ui-*`, los estilos base y el CSS de los componentes de la librería.
- Se reescribió `src/styles/globales.css`: ya no define ningún color ni valor de geometría propio. Los nombres en español que usan las pantallas (`--color-lienzo`, `--color-superficie`, `--color-texto`, `--color-acento`, los radios…) ahora se mapean a los tokens `--ui-*` de la librería con `var()`. Si la librería cambia un valor, el panel lo hereda. Se conservó la hoja de impresión `@media print`, que es propia del panel.
- Se migró el control de tema de la clase `.dark` a `data-theme="dark"` en `index.html`, que es el mecanismo que entiende la librería. Nocturne sigue siendo dark-first.
- Verificado: `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan. La paleta no cambia visualmente porque los valores hex de la librería y los que el panel duplicaba eran los mismos.

**Archivos modificados:**

- `src/main.tsx`
- `src/styles/globales.css`
- `index.html`
- `CHANGELOG.md`

## 2026:09:21 23:25

**Resumen:** Arranque del repositorio: plan de construcción, rama con la convención de nombres del proyecto y scaffold verificado de la aplicación web.

**Cambios:**

- Se escribió `docs/PLAN.md` con el plan completo: propósito, la decisión de arquitectura de no construir un backend, stack, estructura, contrato de lectura, autorización del rol del analista, pantallas, métricas del reporte, índices de Firestore, fases y pendientes.
- Se reinicializó el repositorio, cuyo `.git` se había perdido, y se restauró el remoto `AI27-Tech/pf-web-frontend-analist-panel`. La rama inicial se llama `pf-wfap-d`, siguiendo la convención `pf-<abreviatura>-{d,m,q}` de los otros repositorios del proyecto.
- Se montó el scaffold en paridad de stack con `pf-web-frontend-internal`: Vite 8, React 19, TypeScript, TanStack Router con ruteo por archivos, TanStack Query, Tailwind 4, Vitest, ESLint, Prettier y Husky.
- Se definieron los tokens de Nocturne en `src/styles/globales.css`, con la variante clara y la hoja de estilos de impresión del reporte. La paleta es la misma que usan la app de custodio, el panel interno y el portal del cliente.
- Se montó la frontera de datos: `src/lib/firebase/` inicializa el SDK y `src/lib/datos/` expone consultas con tipos propios del panel. Se agregó una regla de ESLint que **prohíbe importar el SDK de Firebase fuera de esas dos carpetas**, para que cambiar de fuente de datos en el futuro quede contenido en una carpeta.
- La regla detectó una violación en el propio scaffold —dos rutas importaban de `lib/firebase/`— y se corrigió moviendo el acceso a la sesión a `lib/datos/sesion.ts`.
- Se agregaron las rutas: inicio de sesión con Firebase Auth, layout privado con barra lateral de cuatro destinos y guard de sesión, y los marcadores de Viajes, Galería, Reporte y Ajustes.
- Se agregó el cálculo de rangos de fecha con sus pruebas: los atajos de hoy, semana y mes se calculan sobre el calendario y en zona de México, para que coincidan con los cortes semanal y mensual que entrega el analista.
- Se excluyó `@ai27-tech/ui` de las dependencias: se publica en GitHub Packages y requiere un token con permiso de lectura de paquetes, que no está configurado. Se documentó cómo habilitarla en `.npmrc.example`.
- Se aprobaron explícitamente los scripts de instalación de `protobufjs` y `@firebase/util` en `pnpm-workspace.yaml`, que el SDK de Firebase necesita.
- Se agregó el `README.md` con el arranque y los dos bloqueos vigentes: el rol del analista en las reglas de seguridad y el acceso a la librería de componentes.
- Se excluyó de git la carpeta `docs/mock-web-analist/`: son unos 5.6MB de PNG y HTML generados en Stitch, material de referencia para implementar y no código. Mismo criterio que `mock-app-design-language` en el repositorio de la app.

**Archivos modificados:**

- `docs/PLAN.md`
- `README.md`
- `CHANGELOG.md`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `eslint.config.js`
- `index.html`
- `.gitignore`
- `.prettierrc`
- `.prettierignore`
- `.env.example`
- `.npmrc.example`
- `src/main.tsx`
- `src/vite-env.d.ts`
- `src/styles/globales.css`
- `src/lib/firebase/cliente.ts`
- `src/lib/datos/tipos.ts`
- `src/lib/datos/sesion.ts`
- `src/lib/datos/viajes.ts`
- `src/lib/datos/medios.ts`
- `src/lib/formato/fechas.ts`
- `src/lib/formato/fechas.test.ts`
- `src/components/EncabezadoPagina.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/login.tsx`
- `src/routes/_privado.tsx`
- `src/routes/_privado/viajes.tsx`
- `src/routes/_privado/galeria.tsx`
- `src/routes/_privado/reporte.tsx`
- `src/routes/_privado/ajustes.tsx`
- `src/pruebas/setup.ts`
