import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Usuario dueño de los datos de la base local creada antes de que existieran cuentas. */
export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Solo para cuentas de GitHub; los invitados y el usuario local no tienen
  githubId: varchar("github_id", { length: 40 }).unique(),
  name: varchar("name", { length: 100 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  isGuest: boolean("is_guest").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Para borrar invitados inactivos
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionType = pgEnum("transaction_type", ["ingreso", "gasto"]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Al borrar un usuario se borran sus movimientos
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionType("type").notNull(),
    // El dinero se guarda en centavos (entero) para evitar errores de punto flotante.
    amountCents: integer("amount_cents").notNull(),
    description: varchar("description", { length: 100 }).notNull(),
    category: varchar("category", { length: 40 }).notNull(),
    // Fecha "calendario" (sin hora) como string YYYY-MM-DD: evita líos de zona horaria.
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Todas las consultas filtran por usuario y casi todas por fecha
  (t) => [index("transactions_user_date_idx").on(t.userId, t.date)],
);

export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionType = (typeof transactionType.enumValues)[number];
