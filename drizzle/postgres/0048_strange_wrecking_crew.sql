CREATE TYPE "public"."document_category" AS ENUM('modelo_contrato', 'contrato', 'minuta', 'estatuto', 'ata', 'oficio', 'rh', 'evento', 'nota_fiscal', 'comprovante', 'outro');--> statement-breakpoint

CREATE TABLE "documents" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"category" "document_category" NOT NULL,
	"storage_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" text NOT NULL,
	"uploaded_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_documents_file_size" CHECK ("file_size" >= 0 AND "file_size" <= 15728640)
);--> statement-breakpoint

ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_admins_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "idx_documents_category" ON "documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_documents_created_at" ON "documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_documents_uploaded_by" ON "documents" USING btree ("uploaded_by");--> statement-breakpoint

-- Trigger para manter updated_at sincronizado em UPDATEs fora do ORM
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS documents_set_updated_at ON "documents";--> statement-breakpoint
CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON "documents"
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();--> statement-breakpoint

-- Habilitar RLS
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Criar Políticas de RLS
-- SELECT: staff tem acesso, exceto diretoria
CREATE POLICY documents_select_policy ON "documents"
  FOR SELECT TO authenticated
  USING (
    is_staff_role()
    AND get_current_admin_role() <> 'diretoria'
  );--> statement-breakpoint

-- INSERT: role permitida + uploaded_by deve ser o admin corrente
CREATE POLICY documents_insert_policy ON "documents"
  FOR INSERT TO authenticated
  WITH CHECK (
    is_staff_role()
    AND get_current_admin_role() <> 'diretoria'
    AND "uploaded_by" = get_current_admin_id()
  );--> statement-breakpoint

-- UPDATE: criador ou admin global pode alterar
CREATE POLICY documents_update_policy ON "documents"
  FOR UPDATE TO authenticated
  USING (
    is_staff_role()
    AND get_current_admin_role() <> 'diretoria'
    AND ("uploaded_by" = get_current_admin_id() OR get_current_admin_role() = 'admin')
  )
  WITH CHECK (
    is_staff_role()
    AND get_current_admin_role() <> 'diretoria'
    AND ("uploaded_by" = get_current_admin_id() OR get_current_admin_role() = 'admin')
  );--> statement-breakpoint

-- DELETE: criador ou admin global pode excluir
CREATE POLICY documents_delete_policy ON "documents"
  FOR DELETE TO authenticated
  USING (
    is_staff_role()
    AND get_current_admin_role() <> 'diretoria'
    AND ("uploaded_by" = get_current_admin_id() OR get_current_admin_role() = 'admin')
  );