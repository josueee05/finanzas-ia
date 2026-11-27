import type { TransactionType } from "@/db/schema";

/**
 * Clasificador local por palabras clave (modo demo, sin API key).
 * Gratis, instantáneo y determinista: también es el respaldo si la IA falla.
 */

const KEYWORDS: Record<TransactionType, Record<string, string[]>> = {
  gasto: {
    comida: [
      "super", "supermercado", "walmart", "paiz", "la torre", "despensa", "pricesmart", "mercado",
      "restaurante", "almuerzo", "cena", "desayuno", "refaccion", "cafe", "cafeteria", "starbucks",
      "pizza", "pollo", "campero", "mcdonalds", "burger", "hamburguesa", "taco", "tacos", "comida",
      "panaderia", "pan", "tortillas", "verduras", "frutas", "carne", "pedidosya", "uber eats", "hugo",
      "delivery", "abarrotes", "tienda de barrio",
    ],
    transporte: [
      "uber", "indriver", "taxi", "gasolina", "gasolinera", "combustible", "diesel", "bus",
      "transmetro", "transurbano", "parqueo", "parking", "peaje", "shell", "puma", "texaco",
      "mecanico", "llantas", "cambio de aceite", "servicio del carro", "pasaje", "moto",
    ],
    vivienda: [
      "alquiler", "renta", "hipoteca", "condominio", "cuota de mantenimiento", "apartamento",
      "casa", "plomero", "reparacion",
    ],
    servicios: [
      "luz", "energia", "electricidad", "eegsa", "energuate", "agua", "empagua", "internet",
      "telefono", "celular", "tigo", "claro", "cable", "gas", "recarga", "plan pospago",
    ],
    entretenimiento: [
      "netflix", "spotify", "disney", "hbo", "prime video", "youtube premium", "streaming", "cine",
      "cinepolis", "concierto", "entradas", "juego", "videojuego", "steam", "playstation", "xbox",
      "nintendo", "fiesta", "bar", "cerveza", "boliche", "salida",
    ],
    salud: [
      "farmacia", "medicina", "medicamento", "medico", "doctor", "consulta", "hospital", "clinica",
      "dentista", "laboratorio", "examen", "seguro medico", "gimnasio", "gym", "cruz verde",
      "galeno", "batres", "meykos", "optica", "lentes", "vitaminas",
    ],
    educacion: [
      "curso", "universidad", "colegiatura", "colegio", "libro", "libros", "udemy", "platzi",
      "coursera", "inscripcion", "matricula", "utiles", "diplomado", "maestria", "clases", "umg",
      "usac", "landivar",
    ],
    compras: [
      "ropa", "zapatos", "tenis", "amazon", "temu", "shein", "cemaco", "electronica", "audifonos",
      "laptop", "computadora", "mall", "pacas", "regalo para", "accesorios", "muebles", "decoracion",
    ],
  },
  ingreso: {
    salario: ["salario", "sueldo", "nomina", "planilla", "quincena", "aguinaldo", "bono 14", "bono", "pago mensual"],
    freelance: [
      "freelance", "proyecto", "cliente", "honorarios", "diseno", "consultoria", "factura",
      "trabajo extra", "upwork", "fiverr", "servicios profesionales", "comision",
    ],
    inversiones: ["intereses", "dividendos", "inversion", "plazo fijo", "rendimiento", "cripto", "acciones", "ahorro"],
    regalos: ["regalo", "cumpleanos", "navidad", "remesa", "herencia", "me regalaron"],
  },
};

/** "Almuerzo en Campero" -> "almuerzo en campero" (minúsculas, sin tildes ni signos) */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Palabras de 4+ letras también coinciden como prefijo ("super" -> "supermercado",
// "libro" -> "libros"); las cortas ("luz", "gas", "bar") solo como palabra completa.
const PATTERNS = Object.fromEntries(
  Object.entries(KEYWORDS).map(([type, cats]) => [
    type,
    Object.entries(cats).map(([category, words]) => ({
      category,
      words: words.map((w) => {
        const n = normalize(w);
        return { length: n.length, re: new RegExp(`(?:^| )${escape(n)}${n.length >= 4 ? "" : "(?= |$)"}`) };
      }),
    })),
  ]),
) as Record<TransactionType, { category: string; words: { length: number; re: RegExp }[] }[]>;

export type RuleMatch = { category: string; score: number };

/**
 * Devuelve la categoría con mayor puntaje (las coincidencias más largas pesan más,
 * porque son más específicas), o null si ninguna palabra clave coincide.
 */
export function categorizeByRules(description: string, type: TransactionType): RuleMatch | null {
  const text = normalize(description);
  if (!text) return null;

  let best: RuleMatch | null = null;
  for (const { category, words } of PATTERNS[type]) {
    const score = words.reduce((sum, w) => (w.re.test(text) ? sum + w.length : sum), 0);
    if (score > 0 && (!best || score > best.score)) best = { category, score };
  }
  return best;
}
