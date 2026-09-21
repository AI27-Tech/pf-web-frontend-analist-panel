# AI27 — Convención de idioma y nombres

## 1. Objetivo

Define el idioma que se usa en AI27 para la **documentación** y para los **identificadores de código y arquitectura**, de modo que todo el producto —documentos, contratos, backend y los dos frontends— comparta una sola convención.

Esta convención **eleva a nivel de workspace** la regla que ya vivía en los README de los repos de frontend (`repos/pf-web-frontend-internal/README.md` y `repos/pf-web-frontend-client/README.md`) y que se aplicó en código el 2026-09-09. No la cambia: la formaliza como estándar del proyecto. Ver `decision-log.md` DEC-024.

---

## 2. La regla

1. **Documentación y prosa: español (México).** Todo el contenido narrativo —documentos de `docs/`, HU, casos de prueba, propuestas, ADR, secciones de steering, mensajes de commit y de CHANGELOG— se escribe en español (México).
2. **Comentarios y docstrings: español.** Los comentarios dentro del código y los docstrings se escriben en español.
3. **Identificadores de código: inglés**, con **una** excepción (punto 4). Aplica a variables, funciones, helpers, tipos técnicos, parámetros, rutas de archivo/carpeta que no nombran un concepto de dominio, y términos técnicos genéricos.
4. **Excepción — sustantivos de dominio: forma canónica en español.** Los sustantivos del lenguaje ubicuo del negocio conservan su forma canónica en español, aunque aparezcan como identificadores de código, nombres de servicio, rutas de API, nombres de evento, esquemas, tablas o roles de base de datos.

---

## 3. Por qué los sustantivos de dominio se quedan en español

No es cosmético. `contracts/` es la fuente única desde la que se generan los tipos de **Go** y **TypeScript** (OpenAPI, eventos, máquina de estados). La documentación de `docs/arquitectura/`, los contratos y el código generado comparten un mismo vocabulario ubicuo. Traducir los sustantivos de dominio rompería la correspondencia entre los tres y convertiría un cambio de nombres en una migración de contratos, eventos, esquemas y código ya escrito.

Por eso el nombre del servicio `operacion`, la ruta `/api/v1/viajes`, el evento `viaje.estado_cambiado`, el esquema `viajes` y el rol `op_viajes` **se mantienen en español**: todos son el sustantivo de dominio `viaje`.

---

## 4. Sustantivos de dominio canónicos

Forma canónica en español (lista de los README, ampliable con el vocabulario ubicuo de `docs/arquitectura/` y `contracts/`):

`viaje`, `bitacora`, `asignacion`, `bandeja`, `conversacion`, `catalogos`, `reportes`, `Audiencia`, `Fresco`, `Sobre`.

También son sustantivos de dominio (y por tanto se conservan en español) los nombres de servicio y los términos ubicuos ya presentes en las fuentes, por ejemplo: `operacion`, `mensajeria`, `identidad`, `procesamiento`, `custodio`, `patrulla`, `unidad`, `incidencia`, `estadia`, `solicitud`, `cliente`, `operador`, `tracto`, `contenedor`, `destino`, `parada`, `condicion`, `sin_senal`, `estado`, `transicion`, `reserva`, `auditoria`, `historico`.

**Servicios que ya están en inglés y se mantienen así:** `bff`, `realtime`, `ingest` (no son sustantivos de dominio del negocio, sino términos técnicos).

**Regla para términos nuevos:** si un término nuevo es un sustantivo de dominio del negocio, se registra su forma canónica en español y se conserva. Si es técnico o genérico, va en inglés. Ante duda sobre si un término es de dominio, preguntar antes de fijarlo (regla de oro del discovery).

---

## 5. Qué va en inglés (ejemplos)

Identificadores que **no** son sustantivos de dominio, alineados con la limpieza ya hecha en el frontend interno el 2026-09-09:

- Acciones y helpers técnicos: `login`, `path`, `target`, `createSessionWire`, `enableMocks`.
- Constantes y mocks técnicos: `DEMO_USER`, `DEMO_CREDENTIALS`.
- Tipos técnicos genéricos y utilidades: `TransportSeq`, `FreshnessMark`, `cn`.

Los comandos de dominio combinan ambas reglas cuando el verbo es acción técnica sobre un sustantivo de dominio; se sigue la forma ya adoptada en los repos (p. ej. los comandos de sesión `iniciarSesion`/`refrescarSesion`/`cerrarSesion` se conservaron por ser lenguaje ubicuo). Ante un caso nuevo ambiguo, preguntar.

---

## 6. Alcance

Aplica a: `docs/arquitectura/` y `contracts/`, el backend en Go (cuando exista), y los dos frontends (`repos/pf-web-frontend-internal`, `repos/pf-web-frontend-client`). Los README de esos repos son la fuente original de la convención; este archivo es su versión de workspace y prevalece si algún día divergen.

Esta convención estandariza el criterio hacia adelante. No obliga a una reescritura masiva inmediata; las inconsistencias existentes (p. ej. identificadores técnicos aún en español, o encabezados de prosa en inglés en algunos documentos de arquitectura) se corrigen cuando se toque cada archivo, salvo que se solicite explícitamente un barrido.
