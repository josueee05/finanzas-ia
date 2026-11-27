# 💸 Finanzas IA

[![CI](https://github.com/josuee05/finanzas-ia/actions/workflows/ci.yml/badge.svg)](https://github.com/josuee05/finanzas-ia/actions/workflows/ci.yml)

Aplicación web de finanzas personales: registra ingresos y gastos, muestra a dónde se va tu dinero y tiene un **asistente con IA** al que le preguntas en tus propias palabras. La categoría de cada gasto se elige sola.

**🔗 Demo:** _próximamente_ · entra con **"Probar como invitado"**, sin registrarte.

<!-- Capturas: agrega aquí imágenes del dashboard, el formulario y el asistente, p. ej.
![Dashboard](docs/dashboard.png) -->

## Qué hace

- **Dashboard mensual:** balance, ingresos, gastos y tasa de ahorro, con la variación contra el mes anterior. Gráfica de 6 meses y gastos por categoría.
- **Categorización automática:** escribes "Almuerzo en Pollo Campero" y se guarda en 🍔 Comida, con [Claude](https://www.anthropic.com/claude) o, sin API key, con un clasificador local.
- **Asistente conversacional:** un botón flotante abre un panel donde preguntas "¿en qué gasté más este mes?" o "dame consejos para ahorrar". Responde en streaming y solo con tus datos reales.
- **Cuentas:** modo invitado (cada visitante tiene su propio espacio con datos de ejemplo) o login con GitHub.
- **Detalles:** filtro por mes en la URL, tema claro/oscuro, formularios que funcionan sin JavaScript, diseño responsive.

## Stack

| Capa          | Tecnología                                                                    |
| ------------- | ----------------------------------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router, Server Actions, Cache Components, Proxy) |
| UI            | React 19 + Tailwind CSS 4; gráficas en SVG hechas a mano                      |
| Base de datos | PostgreSQL con [Drizzle ORM](https://orm.drizzle.team): [Neon](https://neon.tech) en producción, [PGlite](https://pglite.dev) en local y en tests |
| IA            | [Claude API](https://docs.claude.com) (`@anthropic-ai/sdk`): salidas estructuradas y *tool use* |
| Auth          | Sesiones con cookie firmada (HMAC) y OAuth de GitHub, implementados sin librerías |
| Calidad       | TypeScript estricto, Zod, Vitest (135 tests), ESLint, GitHub Actions          |

## Cómo correrlo

Requisitos: Node.js 20.9+ y [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm db:setup   # crea las tablas y carga 6 meses de datos de ejemplo
pnpm dev        # http://localhost:3000
```

**No necesitas Docker, cuentas ni API keys.** La base de datos es PostgreSQL real compilado a WebAssembly (PGlite) y se guarda en `.data/`. En la pantalla de entrada usa "Probar como invitado" o "Continuar como usuario local" (este último solo aparece en desarrollo).

Las variables opcionales (Claude, login con GitHub, Postgres) están documentadas en [`.env.example`](.env.example). Para publicar la app, sigue la guía [docs/DEPLOY.md](docs/DEPLOY.md).

| Comando                                   | Descripción                                                       |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev` / `pnpm build`                 | Servidor de desarrollo / build de producción                       |
| `pnpm test`                               | Tests (unitarios + integración con Postgres en memoria)            |
| `pnpm lint` / `pnpm typecheck`            | ESLint / TypeScript                                                |
| `pnpm db:generate`                        | Genera una migración SQL desde `src/db/schema.ts`                  |
| `pnpm db:migrate` / `pnpm db:seed`        | Aplica migraciones / carga datos de ejemplo del usuario local      |

> Ejecuta los comandos `db:*` con el servidor detenido: PGlite admite un solo proceso a la vez sobre el mismo directorio de datos.

## Arquitectura

```
src/
├── app/
│   ├── page.tsx                  # Dashboard
│   ├── transacciones/            # Lista, formulario y edición
│   ├── entrar/                   # Login: invitado, GitHub, usuario local
│   ├── actions.ts                # Server Actions (crear, editar, borrar, sugerir categoría)
│   └── api/
│       ├── chat/                 # Asistente: streaming NDJSON
│       └── auth/github/          # OAuth: inicio y callback
├── proxy.ts                      # Redirección optimista a /entrar sin cookie
├── components/                   # UI: dashboard, asistente, formulario, navegación…
├── db/
│   ├── schema.ts                 # users + transactions (Drizzle)
│   ├── queries.ts                # Todas las consultas, siempre filtradas por usuario
│   ├── users.ts                  # Invitados, GitHub, limpieza de cuentas inactivas
│   └── index.ts                  # node-postgres (DATABASE_URL) o PGlite
└── lib/
    ├── auth/                     # Token firmado, sesión, usuario actual (DAL)
    ├── ai/                       # Categorización: Claude, reglas y orquestador
    ├── assistant/                # Herramientas de datos, Claude (tool use) y modo demo
    └── …                         # Dinero, fechas, validación, datos de ejemplo
drizzle/                          # Migraciones SQL versionadas
```

## Decisiones técnicas

**Datos y dinero**
- **El dinero se guarda en centavos (`integer`)**, nunca como `float`, para que `0.1 + 0.2` no rompa un balance. El texto que escribe el usuario se convierte a centavos con una expresión regular, sin aritmética decimal.
- **Las fechas son "de calendario" (`YYYY-MM-DD`)** y "hoy" se calcula en la zona horaria de la app, no en la del servidor (UTC en la nube). Un test cubre justo ese caso borde.
- **Un solo esquema y dos motores:** en producción, PostgreSQL vía node-postgres; en desarrollo y tests, PGlite. Las mismas migraciones sirven para ambos, y los tests de integración corren contra Postgres real en memoria sin servicios externos.

**Seguridad y multiusuario**
- **Cada consulta recibe el `userId` y filtra por él**, también en `UPDATE` y `DELETE`. Un id ajeno simplemente no afecta a nada (y la página de edición responde 404). Hay tests que lo verifican.
- **Las Server Actions verifican la sesión una por una**, porque se pueden invocar con un POST directo. El `proxy` solo hace una redirección optimista; la verificación real vive en una capa de acceso a datos (`getCurrentUser`).
- **Sesión sin librerías:** cookie `httpOnly` + `SameSite=Lax` con un token `payload.firma` (HMAC-SHA256), con expiración y comparación en tiempo constante.
- **OAuth de GitHub a mano:** parámetro `state` aleatorio en cookie contra CSRF, solo el scope `read:user`, y el token de GitHub nunca se guarda.
- **Modo invitado sin fricción:** cada invitado recibe su propio espacio con datos de ejemplo, creado en una transacción. Se borra en cascada al salir o tras 7 días sin uso, y la creación tiene un límite por IP.

**IA**
- **Salidas estructuradas para categorizar:** Claude responde un JSON validado contra un esquema Zod cuyo `enum` son exactamente las categorías válidas, así que no puede inventar una.
- **El asistente usa *tool use*, no datos pegados en el prompt:** 4 herramientas de solo lectura (resumen del mes, gastos por categoría, búsqueda, serie mensual), con el Tool Runner del SDK y streaming. El prompt le prohíbe dar cifras que no vengan de una herramienta.
- **La IA nunca rompe la app:** sin API key, con la API caída o con una key inválida, todo sigue funcionando con el clasificador local y el modo demo del asistente. Ese modo usa las mismas funciones de datos, así que los dos modos nunca se contradicen.
- **Control de costos:** límite de preguntas por usuario y por IP, historial acotado, caché de categorizaciones y `effort: "low"` en tareas simples.

**Interfaz**
- **Cache Components + streaming:** la estructura de cada página se prerenderiza y los datos llegan dentro de `<Suspense>` con skeletons.
- **Gráficas propias y accesibles:** SVG/HTML sin librerías. La paleta se validó con un script contra contraste y daltonismo en modo claro y oscuro, y cada gráfica tiene leyenda, tooltip accesible con teclado y vista de tabla.
- **Formularios con *progressive enhancement*:** Server Actions + `useActionState` funcionan sin JavaScript; la categoría "✨ Automática" se previsualiza en vivo con *debounce*.
- **Markdown seguro en el chat:** un mini parser que construye elementos de React, nunca `innerHTML`.

## Tests

```bash
pnpm test
```

135 tests con Vitest:
- **Unitarios:** dinero, fechas y zonas horarias, validación, clasificador, intérprete del asistente, token de sesión y limitador de uso.
- **Integración:** consultas SQL reales sobre PGlite en memoria, incluidos aislamiento entre usuarios, ciclo de vida de invitados y comodines SQL escapados.

El CI corre lint, tipos, tests y build en Node 22 y 24 en cada push.
