ALTER TABLE "associates" ALTER COLUMN "association_status" DROP DEFAULT;
ALTER TABLE "associates" ALTER COLUMN "contribution_status" DROP DEFAULT;

ALTER TYPE "association_status" RENAME TO "association_status_old";
CREATE TYPE "association_status" AS ENUM ('associado', 'nao_associado');
ALTER TABLE "associates" ALTER COLUMN "association_status"
  TYPE "association_status"
  USING (
    CASE
      WHEN "association_status"::text = 'ativo' THEN 'associado'
      ELSE 'nao_associado'
    END
  )::"association_status";
ALTER TABLE "associates" ALTER COLUMN "association_status" SET DEFAULT 'nao_associado';
DROP TYPE "association_status_old";

UPDATE "associates"
SET "contribution_status" = 'inadimplente'
WHERE "contribution_status"::text = 'pendente_migracao';

ALTER TYPE "contribution_status" RENAME TO "contribution_status_old";
CREATE TYPE "contribution_status" AS ENUM ('em_dia', 'inadimplente');
ALTER TABLE "associates" ALTER COLUMN "contribution_status"
  TYPE "contribution_status"
  USING (
    CASE
      WHEN "contribution_status"::text = 'em_dia' THEN 'em_dia'
      ELSE 'inadimplente'
    END
  )::"contribution_status";
ALTER TABLE "associates" ALTER COLUMN "contribution_status" SET DEFAULT 'inadimplente';
DROP TYPE "contribution_status_old";
