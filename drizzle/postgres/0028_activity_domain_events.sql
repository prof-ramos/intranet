-- ADR 018: Eventos de domínio de atividades no outbox de webhooks.
-- Adiciona 6 valores ao enum domain_event_type (ciclo de vida do Kanban) e
-- 'activity' ao enum domain_event_entity_type. Migração one-way (ADD VALUE é
-- irreversível no Postgres); o downgrade de aplicação tolera o enum expandido.
-- Formato alinhado aos precedentes 0006/0009 (ADD VALUE IF NOT EXISTS).
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.created';
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.status_changed';
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.assigned';
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.completed';
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.priority_changed';
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.due_date_changed';
ALTER TYPE "public"."domain_event_entity_type" ADD VALUE IF NOT EXISTS 'activity';