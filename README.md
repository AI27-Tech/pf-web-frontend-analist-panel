# pf-web-frontend-analist-panel

`panel-analista` — la herramienta con la que **un analista** revisa la evidencia que capturan los 37 custodios con [`pf-app-custodio`](../pf-app-custodio), y produce el reporte que se entrega al cliente.

Dos trabajos, en este orden de importancia:

1. **Ver las fotos para leer lo que hay dentro.** La evidencia que el cliente necesita no es la foto como objeto, es su contenido: un número de candado, un folio, un documento. El visor con zoom es el producto; todo lo demás es cómo llegar a él.
2. **El reporte con gráficas**, con rango de fechas y exportable a PDF por el navegador.

El diseño vive en `docs/mock-web-analist/` (21 pantallas generadas en Stitch) y el plan completo en [`docs/PLAN.md`](docs/PLAN.md). **La carpeta del diseño no se versiona** —son unos 5.6MB de PNG y HTML de referencia—, así que si acabas de clonar el repo, pídela a quien la tenga.

**Estado: scaffold.** Navega, autentica contra Firebase y tiene la frontera de datos montada; las pantallas son marcadores. Ver las fases en `docs/PLAN.md` §12.

---

## Arquitectura en una frase

**No hay backend.** El navegador habla directo con Firebase (Auth, Firestore, Storage) y la autorización vive en las reglas de seguridad del proyecto, no en este código. El razonamiento completo, y los tres límites reales de esa decisión, están en `docs/PLAN.md` §2.

La consecuencia práctica, y la regla más importante del repo:

> Todo el acceso a Firebase vive en `src/lib/firebase/` y `src/lib/datos/`. **Ninguna pantalla importa el SDK de Firebase.** Las pantallas piden `listarViajes(filtros)`, no `getDocs(query(...))`.

Eso es lo que hace que migrar a un BFF en Go —el día que la identidad de la plataforma esté lista y este panel se absorba— sea un cambio contenido en una carpeta en lugar de una reescritura. Una regla de ESLint lo impone; no es una convención de buena voluntad.

---

## Arrancar

```bash
pnpm install
cp .env.example .env     # y llena apiKey y appId desde la consola de Firebase
pnpm dev
```

| Comando          | Qué hace                                          |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | servidor de desarrollo                            |
| `pnpm build`     | genera el árbol de rutas, typechequea y compila   |
| `pnpm typecheck` | sólo tipos                                        |
| `pnpm lint`      | ESLint, incluida la regla de la frontera de datos |
| `pnpm format`    | Prettier                                          |
| `pnpm test`      | Vitest                                            |

`src/routeTree.gen.ts` lo genera el CLI de TanStack Router (`pnpm routes`) y **no se versiona**.

---

## Dos cosas que hoy bloquean el uso real

### 1. El analista todavía no puede leer nada

Las reglas de Firestore del proyecto autorizan la lectura **sólo al custodio dueño** de cada documento. El analista no es dueño de nada, así que con las reglas actuales no ve ni un registro. Hacen falta un claim `rol: analista`, una rama de lectura en `firestore.rules` y otra en `storage.rules`. Está detallado en `docs/PLAN.md` §6 y es la fase **F1**.

Mientras eso no exista, se puede trabajar contra el **Emulator Suite** poniendo `VITE_USAR_EMULADORES=true` en el `.env`.

### 2. `@ai27-tech/ui` requiere acceso a GitHub Packages

La librería de componentes de AI27 **no está en el registro público de npm**: se publica en GitHub Packages y necesita un token con `read:packages`. Por eso no está en `package.json` todavía.

Mientras no se configure, el panel usa los tokens de Nocturne directamente desde `src/styles/globales.css`, así que **la paleta es la correcta** aunque no haya componentes prefabricados. Para habilitarla, ver [`.npmrc.example`](.npmrc.example).

---

## Convenciones

Prosa y comentarios en español (México). Identificadores técnicos en inglés, **salvo los sustantivos de dominio**, que conservan su forma en español: `viaje`, `medio`, `custodio`, `placas`, `etiqueta`, `reporte`. Es la convención del workspace; ver `.kiro/steering/naming-conventions.md` y `decision-log.md` DEC-024.

Todo cambio se registra en [`CHANGELOG.md`](CHANGELOG.md), según `.kiro/steering/changelog.md`.
