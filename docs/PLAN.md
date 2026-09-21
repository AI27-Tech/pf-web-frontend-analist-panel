# PLAN — Panel del analista: visor de evidencia y reporte imprimible

## 1. Qué es y para quién

Un **solo analista** necesita dos cosas sobre la evidencia que capturan los 37 custodios con `pf-app-custodio`:

1. **Ver las fotos para leer lo que hay dentro de ellas.** La evidencia que el cliente necesita no es la foto como objeto, es su contenido: un número de candado, un folio, un documento, el estado de una caja. El analista abre las fotos, lee y transcribe. Hoy eso lo hace rebuscando en un grupo de WhatsApp.
2. **Un reporte con gráficas** sobre los metadatos que sí estamos recabando, con rango de fechas y exportable a PDF.

Eso ordena las prioridades sin ambigüedad: **el visor de fotos es el producto**; el reporte es el acompañante. Cualquier duda de diseño se resuelve preguntando cuál de los dos sirve.

**Lo que este panel no hace todavía:** extraer automáticamente el contenido de las fotos. Esa capacidad —OCR, lectura de folios, clasificación— es la que de verdad resolvería el trabajo del analista, y no entra en esta entrega. El panel es la herramienta manual que la sustituye mientras no exista, y el modelo de datos queda listo para cuando exista.

---

## 2. La pregunta de arquitectura: ¿hace falta un backend en Go?

**No. El navegador habla directo con Firebase, y las reglas de seguridad son el perímetro.**

El SDK web de Firebase se conecta desde el navegador a Auth, Firestore y Storage. La autorización no vive en el frontend: vive en `firestore.rules` y `storage.rules`, que el servidor de Firebase evalúa en cada operación. El frontend puede pedir lo que quiera; lo que obtiene lo decide la regla.

### Por qué no un backend propio

Un servicio en Go entre el navegador y Firebase tendría que, como mínimo: guardar y rotar una llave de cuenta de servicio, desplegarse y monitorearse, puentear la sesión de Firebase Auth con una sesión propia, y **reimplementar la autorización que las reglas ya expresan**. Es más superficie de seguridad y más piezas móviles para un producto de **un usuario que sólo lee**.

Hay un argumento más fuerte, y ya lo vivimos en este proyecto: meter un segundo modelo de identidad donde ya hay uno es la manera de terminar con dos ciclos de vida de token y dos historias de revocación. Aquí la identidad es Firebase Auth, la misma de la app. Que siga siendo una.

### Qué sí necesita privilegio, y por qué no es un backend

Poner el claim `rol: analista` en el token requiere el **Admin SDK**, que no puede correr en el navegador. Pero eso se hace **una vez por usuario**, no en cada petición: es un **script de provisión** que un administrador corre a mano con una cuenta de servicio, igual que hoy se crean las cuentas de los custodios por consola. Un paso de alta no es un backend.

### Los tres límites reales de ir directo, y qué hacemos con cada uno

| Límite                                    | Qué pasa                                                                                         | Qué hacemos                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agregados para las gráficas**           | Bajar un mes de `medios` al navegador para contar son ~55,000 lecturas y varios segundos         | Usar **consultas de agregación** de Firestore (`count`, `sum`): cuentan del lado del servidor y cobran ~1 lectura por cada 1,000 coincidencias. Un mes pasa de 55,000 lecturas a unas decenas |
| **Descarga del expediente**               | No hay endpoint que empaquete                                                                    | Se arma el ZIP **en el navegador** con las URLs de descarga. Un viaje de 50 fotos son ~25–50MB: viable. Si algún día se necesita un ZIP de un mes, ahí sí entra una función                   |
| **Métricas que comparan campos entre sí** | El desfase entre `createdAtDevice` y `createdAtServer` no se puede agregar del lado del servidor | Se resuelve por muestreo, o calculando el desfase al escribir. Se difiere: es la única métrica de la lista que no sale con agregación                                                         |

### Cuándo sí habrá que revisar esto

Cuando la identidad de la plataforma (Cognito) sea la fuente de verdad y este panel se absorba en `pf-web-frontend-internal`, o cuando el servicio `reportes` en Go sea el modelo de lectura. Ese día el proyecto de Firebase pasa a ser un detalle de ingestión y el panel cambia de fuente de datos.

**Por eso la regla de diseño más importante del repo:** todo el acceso a Firebase vive detrás de una capa de datos en `src/lib/datos/`, y **ninguna pantalla importa el SDK de Firebase directamente**. Las pantallas piden `listarViajes(filtros)`, no `getDocs(query(...))`. Cambiar de Firebase a un BFF en Go queda contenido en una carpeta en lugar de ser una reescritura. Es la diferencia entre una decisión reversible y una irreversible, y cuesta casi nada tomarla ahora.

### Sobre la llave pública de Firebase

La `apiKey` del SDK web va en el código del cliente y **no es un secreto**: identifica al proyecto, no autoriza nada. Igual que en la app, donde vive en `google-services.json` versionado. Lo que protege los datos son las reglas. Lo que nunca va al repo es la **cuenta de servicio** del script de provisión.

---

## 3. Stack

Paridad deliberada con `pf-web-frontend-internal`, para que el día que se absorba no haya que traducir nada:

| Pieza         | Elección                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- |
| Build         | Vite 8 + TypeScript                                                                          |
| UI            | React 19                                                                                     |
| Ruteo         | TanStack Router                                                                              |
| Datos y caché | TanStack Query                                                                               |
| Estilos       | Tailwind 4                                                                                   |
| Componentes   | **`@ai27-tech/ui`** — trae Nocturne completo; no se replica el sistema de diseño, se instala |
| Iconos        | lucide-react                                                                                 |
| Backend       | **`firebase`** (SDK web: Auth, Firestore, Storage)                                           |
| Gráficas      | una librería de charts (a elegir en F3)                                                      |
| ZIP           | JSZip, sólo si se confirma la descarga del expediente                                        |
| Pruebas       | Vitest                                                                                       |
| Formato       | Prettier + ESLint + Husky                                                                    |

TanStack Query hace más trabajo del que parece: el reporte y los listados se cachean, así que un analista que vuelve a la misma vista no vuelve a pagar las lecturas.

---

## 4. Estructura del repo

```
src/
├── app/                  arranque, providers, router
├── lib/
│   ├── firebase/         inicialización del SDK: app, auth, firestore, storage
│   ├── datos/            LA FRONTERA. Funciones de consulta que devuelven tipos propios
│   │   ├── viajes.ts     listarViajes, obtenerViaje
│   │   ├── medios.ts     listarMedios, urlOriginal, urlMiniatura
│   │   ├── metricas.ts   las agregaciones del reporte
│   │   └── tipos.ts      Viaje, Medio, Etiqueta — tipos del panel, no documentos de Firestore
│   └── formato/          fechas, tamaños, duraciones
├── features/
│   ├── sesion/           login, guard, cierre de sesión
│   ├── viajes/           lista y filtros
│   ├── expediente/       el viaje con su galería
│   ├── visor/            el visor con zoom — el corazón del producto
│   ├── galeria/          galería entre viajes
│   └── reporte/          métricas, gráficas y vista de impresión
├── components/           lo propio que no está en @ai27-tech/ui
├── routes/               (auth)/ y _private/
└── styles/               tailwind + hoja de impresión
```

La regla de `src/lib/datos/` como única frontera con Firebase se verifica con una regla de ESLint que prohíbe importar `firebase/*` fuera de `lib/firebase/` y `lib/datos/`. Sin eso, la disciplina se erosiona en la tercera pantalla.

---

## 5. Lo que consume: contrato de lectura

El panel es **sólo lectura**. No escribe ni un documento. Las colecciones y campos son los que define `pf-app-custodio/docs/PLAN.md` §5.1, y este repo no los redefine: los consume.

De `reportes` usa `placas`, `custodioCorreo`, `fechaLocal`, `createdAtServer`, `closedAt`, `comentario`, `hayNovedad`, `ciclo`, `motivoDescarte`, `completo`, `mediosEsperados`, `mediosSubidos`, `resumenMedios`.

De `medios` usa `reporteId`, `tipo`, `etiqueta`, `storagePath`, `thumbnailPath`, `createdAtDevice`, `createdAtServer`, `gps`, `ubicacionTexto`, `comentario`, `sizeBytes`, `durationMs`, `placas`, `custodioUid`, `fechaLocal`.

La desnormalización que lleva `medios` —`placas`, `custodioUid`, `fechaLocal`— es justo lo que permite filtrar archivos sin joins. Firestore no los tiene.

**Dos cosas que hay que tener presentes al construir el visor:**

- **El visor carga `storagePath`, nunca `thumbnailPath`.** La miniatura es de 320px y no sirve para leer nada. Las miniaturas son sólo para rejillas.
- **El original hoy es 1920×1080 en JPEG calidad 88.** Para leer texto pequeño eso es marginal, y 16:9 desperdicia encuadre en documentos verticales. Es una decisión abierta del lado de la app, no de este panel, pero determina si el visor sirve para su propósito.

---

## 6. Autorización: el rol del analista

**Esto bloquea todo y va primero.** Tal como están hoy las reglas del proyecto, la lectura es **sólo del dueño**:

```
allow read: if autenticado() && (resource == null || esDuenoDe(resource));
```

El analista no es dueño de nada, así que **hoy no puede leer un solo documento**. Hacen falta tres cosas:

1. **Claim personalizado** `rol: analista` en el usuario del analista, puesto con un script de provisión usando el Admin SDK. Se documenta en el README junto al alta de custodios.
2. **Rama de lectura en `firestore.rules`** para ese rol en `reportes`, `medios` y `catalogos`. Importa que la condición sea **independiente del documento** (`request.auth.token.rol == 'analista'`), porque las reglas de Firestore no filtran consultas: una condición por documento como `esDuenoDe` hace que las consultas de lista fallen, mientras que una condición sobre el token las deja pasar.
3. **Rama de lectura en `storage.rules`.** La regla actual hace un `firestore.get()` por archivo para comprobar el dueño: eso cobra **una lectura de Firestore por cada miniatura** que el analista vea, más latencia. La rama del analista debe autorizar por el claim, sin tocar Firestore.

La escritura sigue negada para el analista en todo. Los reportes y los medios son inmutables por diseño, y este panel no cambia eso.

**Se prueba con el Emulator Suite**, extendiendo `pf-app-custodio/firebase/test/reglas.test.js`: que el analista lee todo, que no escribe nada, y que un custodio sigue sin poder leer lo de otro.

---

## 7. Pantallas

Modelo de dos niveles: **el viaje es la entrada, la galería vive dentro**. El diseño está en `docs/mock-web-analist/`, 21 pantallas generadas con los 25 prompts de Stitch acordados. Esa carpeta **no se versiona** —unos 5.6MB de PNG y HTML de referencia, mismo criterio que los mockups de la app—, así que se comparte aparte del repo.

Las pantallas usan la paleta de **Nocturne**, la misma de la app y de los frontends web. El `DESIGN.md` que Stitch generó junto a ellas trae otra paleta en su frontmatter, pero ninguna pantalla la usa: manda lo que dicen las pantallas.

| Pantalla       | Qué hace                                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login**      | Correo y contraseña de Firebase Auth. Sin registro ni recuperación en v1                                                                                                                                                |
| **Viajes**     | La principal. Lista filtrable por fecha, placa, custodio, etiqueta y novedad; cada renglón lleva una **tira de miniaturas** para ver qué hay dentro sin abrir. Chips de filtro activo, conteo de resultados, cargar más |
| **Expediente** | Un viaje: cabecera con métricas, comentario, y la galería completa agrupada por etiqueta. Descargar todo                                                                                                                |
| **Visor**      | Superposición a pantalla completa con **zoom, desplazamiento y rotación**, panel de metadatos al lado y navegación con flechas del teclado. Lo más importante del panel                                                 |
| **Galería**    | Archivos entre viajes, para "todas las fotos de tal etiqueta en tal periodo"                                                                                                                                            |
| **Reporte**    | Métricas y gráficas con rango configurable y atajos. Con su vista de impresión                                                                                                                                          |
| **Ajustes**    | Tema, correo de la sesión, cerrar sesión                                                                                                                                                                                |

Escritorio y tablet. En tablet la barra lateral se colapsa a iconos y los filtros se envuelven.

---

## 8. El reporte

Una sola vista con **rango personalizable y atajos** Hoy / Semana / Mes / Rango. No tres pantallas.

**El PDF no se genera con librería:** la vista de impresión es una hoja de estilos `@media print` sobre la misma pantalla, y el PDF lo produce el navegador. El reporte _es_ el PDF, así que no hay dos formatos que mantener sincronizados.

Cinco secciones, las que eligió Producto. **Deliberadamente no hay métricas de volumen ni rankings de custodios por cantidad de fotos:** medir a una persona por cuántas fotos manda le enseña a mandar fotos basura, y contamina la evidencia que este panel existe para leer.

| Sección                 | Métricas                                                                                                                   | Cómo se calcula                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Adopción**            | Custodios activos por semana sobre 37; lista de inactivos; tendencia de viajes por semana                                  | `count` agrupado por semana y por `custodioUid`                                                 |
| **Operación y tiempos** | Distribución de duración del viaje; distribución horaria de capturas; latencia de subida; viajes abiertos demasiado tiempo | `count` por cubeta; la latencia necesita comparar dos marcas de tiempo, así que va por muestreo |
| **Cobertura**           | Viajes con y sin novedad; descartados y sus motivos; viajes incompletos; **distribución** de archivos por viaje            | `count` con filtros sobre `hayNovedad`, `ciclo`, `completo`                                     |
| **Calidad de datos**    | Porcentaje de archivos sin GPS por custodio; precisión y antigüedad del fix                                                | `count` sobre `gps == null`; la precisión promedio con `average` sobre `gps.accuracyM`          |
| **Costos**              | GB acumulados y crecimiento mensual                                                                                        | `sum` sobre `sizeBytes`                                                                         |

Dos cosas que conviene no perder de vista:

- **La distribución de archivos por viaje se presenta como distribución, no como "viajes con menos de N archivos".** Ese N no está definido por nadie y no lo inventamos: la distribución muestra el mismo problema sin afirmar un umbral que el negocio no aprobó.
- **La cobertura por etiqueta —qué viajes no traen ninguna foto de tal etiqueta— es la métrica que de verdad mide el "control de validaciones"**, y hoy no se puede construir porque el catálogo de etiquetas sigue pendiente de definición. Queda diseñada y desactivada.

---

## 9. Índices de Firestore

Las agregaciones y los filtros combinados necesitan índices compuestos declarados, y es el tipo de cosa que se descubre en producción si no se planea. Los que se anticipan sobre `medios`: `fechaLocal` + `etiqueta`, `fechaLocal` + `custodioUid`, `fechaLocal` + `placas`, `fechaLocal` + `tipo`. Sobre `reportes`: `fechaLocal` + `ciclo`, `fechaLocal` + `custodioUid`, `fechaLocal` + `hayNovedad`, `placas` + `fechaLocal`.

Se versionan en `firebase/firestore.indexes.json` del repo de la app, que es donde vive la configuración del proyecto.

---

## 10. Descarga de evidencia

Pendiente de confirmar con Producto **cómo llegan las fotos al cliente**. Lo que el plan asume mientras: selección múltiple con casillas y **descarga en ZIP armado en el navegador**. Si el entregable real es otro —un documento con el contenido transcrito, un correo, un sistema de terceros—, cambia esta sección y nada más.

---

## 11. Lo que este panel no hace

Sin editar ni borrar archivos: son inmutables por diseño y el analista sólo lee. Sin administrar cuentas de custodio. Sin escribir nada sobre reportes ni medios. Sin mapa embebido —se muestran las coordenadas con enlace externo, para no abrir una dependencia de proveedor de mapas con costo, que es justo lo que el proyecto evitó en la app. Sin notificaciones. Sin búsqueda de texto libre sobre los comentarios: Firestore no la hace y quedó fuera de alcance.

Si el diseño de Stitch dibuja alguna de estas cosas, se borra. Ya pasó en este proyecto que un wireframe arrastró alcance fuera de lo decidido.

---

## 12. Fases

| #      | Fase                                                                                                                                                                                                                       | Termina cuando                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **F0** | Repo: renombrar la rama a la convención, scaffold de Vite + React + TS, Tailwind 4, `@ai27-tech/ui`, TanStack Router y Query, Prettier, ESLint con la regla que prohíbe importar Firebase fuera de `lib/datos/`, Husky, CI | `pnpm build` y `pnpm lint` pasan; la app arranca con una ruta vacía                 |
| **F1** | **Autorización** (§6): claim `rol: analista`, script de provisión, ramas de lectura en las reglas de Firestore y Storage, pruebas con el Emulator Suite                                                                    | El analista lee todo y no escribe nada, probado en el emulador                      |
| **F2** | Capa de datos y sesión: `lib/firebase/`, `lib/datos/` con tipos propios y mappers, login con Firebase Auth, guard de rutas, cierre de sesión                                                                               | Se entra con la cuenta del analista y una consulta de prueba devuelve viajes reales |
| **F3** | **Viajes, expediente y visor.** Es el corazón: lista con filtros y tira de miniaturas, expediente agrupado por etiqueta, y el visor con zoom, rotación y navegación por teclado                                            | El analista abre un viaje real y puede leer el contenido de una foto con zoom       |
| **F4** | Galería entre viajes, con los filtros compartidos                                                                                                                                                                          | Filtrar por etiqueta y periodo entre viajes                                         |
| **F5** | Reporte: agregaciones, gráficas, rango con atajos y hoja de impresión                                                                                                                                                      | El reporte de un mes carga en segundos y el PDF del navegador sale legible          |
| **F6** | Ajustes, tema claro y oscuro, adaptación a tablet, estados vacíos y de error                                                                                                                                               | Recorrido completo en escritorio y tablet                                           |
| **F7** | Despliegue: Firebase Hosting, dominio, README de provisión del analista                                                                                                                                                    | El analista entra desde su navegador                                                |

**F1 va antes que todo lo visual.** Sin el rol, el panel no puede leer un solo documento, y descubrirlo al final es como se terminan abriendo las reglas "temporalmente".

Orden de riesgo: si algo hay que recortar, se recorta F4 y luego F5. **F3 no se recorta**: es el producto.

---

## 13. Pendientes que este plan no resuelve

1. **Catálogo de etiquetas.** El mismo pendiente que bloquea la salida de la app. Aquí alimenta el filtro de Etiqueta, las secciones del expediente y la métrica de cobertura.
2. **Resolución de captura de la app.** Si el propósito es leer el interior de las fotos, 1920×1080 en 16:9 trabaja contra el propósito. Es decisión del repo de la app —está documentada en `pf-app-custodio/docs/PLAN.md` §3.4— pero determina si este panel sirve. Sin resolución suficiente, el visor con zoom muestra píxeles borrosos y la herramienta no cumple su función.
3. **Acceso a `@ai27-tech/ui`.** La librería de componentes de AI27 **no está en el registro público de npm**: se publica en **GitHub Packages** (`https://npm.pkg.github.com`), así que instalarla exige un `.npmrc` con un token que tenga `read:packages` sobre la organización `AI27-Tech`.

   No hay ningún `.npmrc` configurado en la máquina de desarrollo, y `pf-web-frontend-internal` tampoco tiene sus dependencias instaladas, así que **nadie la ha instalado aquí todavía**. Por eso quedó fuera de `package.json`: con ella dentro, `pnpm install` falla con un 404 y el repo no arranca para quien lo clone.

   **El impacto real es menor de lo que parece.** Lo que la librería aporta son componentes prefabricados, no la paleta: los tokens de Nocturne están escritos directamente en `src/styles/globales.css`, así que el panel se ve correcto y consistente con los otros productos sin ella. Lo que cuesta es construir a mano los componentes que ya existen —botones, chips, campos— en lugar de importarlos.

   **Para habilitarla:** copiar `.npmrc.example` a `.npmrc`, poner el token, y `pnpm add @ai27-tech/ui@0.2.0-beta.1`. El `.npmrc` está en `.gitignore`; el token nunca se versiona. Conviene resolverlo antes de F3, que es donde se construye la mayoría de la interfaz y donde se duplicaría el trabajo.

   **Y hay una consecuencia de equipo:** esto mismo va a bloquear a cualquiera que clone el repo, y también a CI cuando exista. El token de CI se configura como secreto; vale la pena dejarlo listo junto con el despliegue de F7.

4. **Cómo llega la evidencia al cliente** (§10).
5. **Extracción automática del contenido de las fotos.** Es lo que de verdad resolvería el trabajo del analista. Fuera de esta entrega; el modelo de datos queda listo.
6. **Absorción en la plataforma.** Este panel es temporal **por decisión, no por descuido**: existe porque la identidad de la plataforma no está lista. Su destino es el panel interno o el servicio `reportes`. La capa de `lib/datos/` es lo que hace que ese día sea un cambio contenido.
