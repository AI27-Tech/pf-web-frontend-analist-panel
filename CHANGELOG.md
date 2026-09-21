# CHANGELOG

Registro de cambios del proyecto Panel del analista. Las entradas más recientes van primero.

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
