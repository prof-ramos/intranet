DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM associates
    WHERE cpf_hash IS NOT NULL
    GROUP BY cpf_hash
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate associate identity hash: cpf_hash';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM associates
    WHERE siape_hash IS NOT NULL
    GROUP BY siape_hash
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate associate identity hash: siape_hash';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM associates
    WHERE primary_email_hash IS NOT NULL
    GROUP BY primary_email_hash
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate associate identity hash: primary_email_hash';
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "idx_associates_cpf_hash";--> statement-breakpoint
DROP INDEX "idx_associates_siape_hash";--> statement-breakpoint
DROP INDEX "idx_associates_primary_email_hash";--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_cpf_hash" ON "associates" USING btree ("cpf_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_siape_hash" ON "associates" USING btree ("siape_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_primary_email_hash" ON "associates" USING btree ("primary_email_hash");
