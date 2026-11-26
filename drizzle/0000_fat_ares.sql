CREATE TYPE "public"."transaction_type" AS ENUM('ingreso', 'gasto');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" varchar(100) NOT NULL,
	"category" varchar(40) NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "transactions" USING btree ("date");