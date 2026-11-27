CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" varchar(40),
	"name" varchar(100) NOT NULL,
	"avatar_url" varchar(500),
	"is_guest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
DROP INDEX "transactions_date_idx";--> statement-breakpoint
-- Editado a mano: los movimientos que ya existían (de antes de las cuentas) pasan
-- a un "usuario local" fijo, para no perderlos. La columna se crea primero sin
-- NOT NULL, se completa y luego se vuelve obligatoria.
ALTER TABLE "transactions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
INSERT INTO "users" ("id", "name") SELECT '00000000-0000-4000-8000-000000000001', 'Usuario local' WHERE EXISTS (SELECT 1 FROM "transactions");--> statement-breakpoint
UPDATE "transactions" SET "user_id" = '00000000-0000-4000-8000-000000000001' WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date");
