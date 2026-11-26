import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const transactionType = pgEnum("transaction_type", ["ingreso", "gasto"]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  (t) => [index("transactions_date_idx").on(t.date)],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionType = (typeof transactionType.enumValues)[number];
