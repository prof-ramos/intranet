ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.comment_added';
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.comment_edited';
ALTER TYPE "public"."domain_event_type" ADD VALUE IF NOT EXISTS 'activity.comment_deleted';
