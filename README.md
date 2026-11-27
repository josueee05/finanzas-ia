# 💸 Finanzas IA

Aplicación web para controlar ingresos y gastos personales, con categorización automática y un asistente financiero impulsado por IA (en desarrollo).

> 🚧 **Estado:** Fase 4 de 5 completada: transacciones, dashboard, categorización con IA y asistente conversacional.

## Funcionalidades

- ✅ Registrar, editar y eliminar ingresos y gastos
- ✅ Dashboard mensual: balance, ingresos, gastos y tasa de ahorro, con variación contra el mes anterior
- ✅ Gráfica de ingresos vs. gastos de los últimos 6 meses (clic en un mes para verlo)
- ✅ Gastos por categoría en barras ordenadas
- ✅ Filtro por mes que se guarda en la URL (`?mes=2026-11`), compartible y con historial del navegador
- ✅ Categorías por tipo de movimiento, con validación en servidor
- ✅ Datos de ejemplo de 6 meses para probar la app al instante
- ✅ Categorización automática: escribes "Almuerzo en Pollo Campero" y la categoría se elige sola, con [Claude](https://www.anthropic.com/claude) o, sin API key, con un clasificador local
- ✅ Asistente en un panel lateral (botón flotante, disponible en todas las páginas y la conversación se conserva al navegar): pregúntale a tus finanzas ("¿en qué gasté más este mes?", "¿cómo voy vs. el mes pasado?", "dame consejos para ahorrar") y responde con tus datos reales, en streaming
- ⏳ Cuentas de usuario, tests automatizados y demo en línea

## Stack

| Capa          | Tecnología                                                                    |
| ------------- | ----------------------------------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router, Server Actions, Cache Components) |
| UI            | React 19 + Tailwind CSS 4                                                     |
| Base de datos | PostgreSQL ([PGlite](https://pglite.dev) en local) + [Drizzle ORM](https://orm.drizzle.team) |
| Validación    | [Zod 4](https://zod.dev)                                                      |
| Gráficas      | SVG + HTML a mano, sin librerías de gráficas                                  |
| IA            | [Claude API](https://docs.claude.com) (`@anthropic-ai/sdk`) con salidas estructuradas |
| Lenguaje      | TypeScript (modo estricto)                                                    |

## Cómo correrlo

Requisitos: Node.js 20+ y [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm db:setup   # crea las tablas y carga datos de ejemplo
pnpm dev        # http://localhost:3000
```

No necesitas Docker ni cuentas externas: la base de datos es PostgreSQL real corriendo en WebAssembly ([PGlite](https://pglite.dev)) y se guarda en `.data/`.

> Ejecuta los comandos `db:*` con el servidor detenido: PGlite solo permite un proceso a la vez sobre el mismo directorio de datos.

### IA: modo demo o Claude

La app funciona completa **sin ninguna API key**: en modo demo, la categoría se elige con un clasificador local de palabras clave en español (con comercios y servicios de Guatemala) y el asistente reconoce las preguntas más comunes (meses, categorías, comparaciones, consejos) y las responde con los datos reales. Para usar Claude, copia `.env.example` como `.env.local` y agrega tu `ANTHROPIC_API_KEY`. La etiqueta junto a "Categoría" en el formulario indica el modo activo (✨ Demo / ✨ IA).

### Scripts

| Comando            | Descripción                                          |
| ------------------ | ---------------------------------------------------- |
| `pnpm dev`         | Servidor de desarrollo                               |
| `pnpm build`       | Build de producción                                  |
| `pnpm lint`        | ESLint                                               |
| `pnpm typecheck`   | Revisión de tipos con TypeScript                     |
| `pnpm db:generate` | Genera una migración SQL a partir de `src/db/schema.ts` |
| `pnpm db:migrate`  | Aplica las migraciones pendientes                    |
| `pnpm db:seed`     | Reemplaza los datos con transacciones de ejemplo     |

## Estructura

```
src/
├── app/
│   ├── actions.ts                      # Server Actions: crear, editar, eliminar
│   ├── page.tsx                        # Dashboard (resumen del mes y gráficas)
│   └── transacciones/                  # Lista + formulario, y [id]/editar
├── components/
│   ├── dashboard/                      # Tarjetas, gráfica mensual, barras por categoría
│   └── ...                             # Formulario, lista, filtro de mes, navegación
├── db/
│   ├── schema.ts                       # Esquema de Drizzle
│   ├── queries.ts                      # Consultas de lectura
│   └── index.ts                        # Conexión (lazy) a la base de datos
└── lib/
    ├── ai/                             # Categorización: Claude, reglas locales y orquestador
    ├── assistant/                      # Asistente: herramientas de datos, Claude y modo demo
    └── ...                             # Dinero, fechas, categorías, validación y tema
drizzle/                                # Migraciones SQL generadas
scripts/                                # migrate y seed
```

## Decisiones técnicas

- **El dinero se guarda en centavos (`integer`)**, nunca como `float`. Así `0.1 + 0.2` no rompe un balance. El monto que escribe el usuario se convierte a centavos con una expresión regular, sin pasar por aritmética decimal.
- **Las fechas son "de calendario" (`date`, `YYYY-MM-DD`)**, no timestamps. "Hoy" se calcula en la zona horaria de la app (`America/Guatemala`), no en la del servidor, que en la nube suele estar en UTC.
- **Server Actions + `useActionState`** en lugar de una API REST: los formularios funcionan incluso sin JavaScript (*progressive enhancement*) y la validación con Zod vive en el servidor, que es donde importa.
- **Cache Components y streaming:** la estructura de la página se prerenderiza y los datos llegan por streaming dentro de `<Suspense>` con skeletons. Como PGlite corre dentro del mismo proceso, las consultas llaman a `connection()` para que Next.js no intente ejecutarlas durante el build.
- **Gráficas hechas a mano (SVG + HTML) en lugar de una librería:** control total del diseño y cero JavaScript extra en las barras por categoría (son HTML puro, renderizadas en el servidor). La gráfica mensual es el único componente cliente: mide su ancho con `ResizeObserver` y maneja hover y foco.
- **Gráficas accesibles:** la paleta se validó con un script contra contraste y los tres tipos de daltonismo, en modo claro y oscuro. Cada gráfica tiene leyenda, tooltip con teclado (no solo mouse) y una vista de tabla, así que ningún dato depende solo del color o del hover.
- **El filtro vive en la URL (`searchParams`)** y no en estado de React: el dashboard sigue siendo un Server Component, el link se puede compartir y los botones atrás/adelante funcionan.
- **IA con salidas estructuradas:** Claude responde un JSON validado contra un esquema Zod cuyo `enum` son exactamente las categorías válidas, así que nunca puede inventar una. La clasificación usa `effort: "low"` porque es una tarea simple (más rápido y barato).
- **La IA nunca rompe la app:** si no hay API key, si la API falla o si rechaza la solicitud, se usa el clasificador local. Con una key inválida se desactiva Claude tras el primer error (en vez de reintentar en cada tecla), y las respuestas se guardan en caché para no pagar dos veces por la misma descripción.
- **El usuario tiene la última palabra:** la categoría "✨ Automática" muestra en vivo dónde se guardará el movimiento (con *debounce* de 400 ms y descartando respuestas viejas); elegir una categoría a mano siempre gana.
- **El asistente usa *tool use*, no datos pegados en el prompt:** Claude recibe 4 herramientas de solo lectura (`resumen_mes`, `gastos_por_categoria`, `buscar_movimientos`, `serie_mensual`) con esquemas Zod y decide cuáles llamar. El Tool Runner del SDK maneja el ciclo, y el prompt le prohíbe dar cifras que no vengan de una herramienta. El modo demo usa exactamente las mismas funciones de datos, así que ambos modos nunca se contradicen.
- **Streaming con NDJSON:** `/api/chat` es un Route Handler que transmite eventos línea por línea (`status` → "Buscando movimientos…", `text` → fragmentos de la respuesta). El cliente los lee con `ReadableStream` y cancela la petición si el usuario sale de la página.
- **Protección de costos:** límite de 20 preguntas por IP cada 10 minutos cuando la IA está activa, historial limitado a 20 mensajes de 2,000 caracteres, y la búsqueda por texto usa parámetros SQL (con `%` y `_` escapados).
- **Markdown seguro:** las respuestas se renderizan con un mini parser propio que construye elementos de React (negritas y listas), nunca `innerHTML`, así que el texto de la IA no puede inyectar HTML.
- **PGlite en desarrollo, Postgres gestionado en producción:** el mismo esquema y las mismas migraciones de Drizzle sirven para ambos.

## Roadmap

- [x] **Fase 1:** base de datos y CRUD de transacciones
- [x] **Fase 2:** dashboard con gráficas
- [x] **Fase 3:** categorización automática con IA
- [x] **Fase 4:** chat con tus finanzas
- [ ] **Fase 5:** autenticación, tests, CI y deploy
