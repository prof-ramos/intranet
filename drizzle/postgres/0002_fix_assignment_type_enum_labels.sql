-- Rename assignment_type enum values from English to Portuguese (canonical ASOF domain terms).
-- Applied directly via psql on 2026-05-26 to the Neon production instance before this migration
-- was created. The ALTER TYPE ... RENAME VALUE is idempotent-safe when values already exist.
-- PostgreSQL will raise an error if the source label does not exist, so guard with DO block.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'assignment_type' AND e.enumlabel = 'domestic'
  ) THEN
    ALTER TYPE "public"."assignment_type" RENAME VALUE 'domestic' TO 'nacional';
    ALTER TYPE "public"."assignment_type" RENAME VALUE 'abroad' TO 'exterior';
  END IF;
END;
$$;
