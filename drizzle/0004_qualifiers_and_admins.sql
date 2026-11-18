CREATE TABLE "round_qualifiers" (
	"round_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "round_qualifiers_round_id_participant_id_pk" PRIMARY KEY("round_id","participant_id")
);
--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "added_by" text;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "qualifier_limit" integer;--> statement-breakpoint
ALTER TABLE "round_qualifiers" ADD CONSTRAINT "round_qualifiers_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_qualifiers" ADD CONSTRAINT "round_qualifiers_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_qualifier_limit_positive" CHECK ("rounds"."qualifier_limit" is null or "rounds"."qualifier_limit" > 0);