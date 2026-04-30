-- Migration 008: Schema Conflict Resolution
-- Resolves conflicting table definitions between 001_initial_schema.sql and later migrations.
--
-- PROBLEM: pending_notifications, audit_events, and idempotency_keys are defined in both
-- 001 (as part of the consolidated initial schema) and in their individual migrations (002, 003, 006).
-- The schemas conflict — e.g. pending_notifications in 001 is missing supplier_id, attempts,
-- last_error, sent_at columns and uses different column names/types than 006.
--
-- FIX: ALTER the tables to match the most complete, correct definition (from 006, 002, 003).
-- Uses IF NOT EXISTS / DO blocks for idempotency.

BEGIN;

-- ============================================================
-- 1. pending_notifications — reconcile 001 vs 006 schema
--    001 schema: (id, order_id, type, status, payload, available_at, created_at, updated_at)
--    006 schema: (id, notification_type, order_id, supplier_id, payload, status, attempts,
--                 last_error, available_at, sent_at, created_at, updated_at)
--
--    Strategy: Add missing columns from 006. Rename "type" → keep as-is but add
--    notification_type as alias. The 006 definition is the canonical one.
-- ============================================================

-- Add missing columns (safe: ADD COLUMN IF NOT EXISTS)
ALTER TABLE "pending_notifications"
    ADD COLUMN IF NOT EXISTS "notification_type" TEXT,
    ADD COLUMN IF NOT EXISTS "supplier_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "last_error" TEXT,
    ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMPTZ;

-- Backfill notification_type from type column if it exists and notification_type is null
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pending_notifications' AND column_name = 'type'
    ) THEN
        UPDATE "pending_notifications"
        SET "notification_type" = "type"
        WHERE "notification_type" IS NULL AND "type" IS NOT NULL;
    END IF;
END $$;

-- Add FK for supplier_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pending_notifications_supplier_id_fkey'
        AND conrelid = 'pending_notifications'::regclass
    ) THEN
        ALTER TABLE "pending_notifications"
            ADD CONSTRAINT "pending_notifications_supplier_id_fkey"
            FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Add missing indexes from 006
CREATE INDEX IF NOT EXISTS idx_pending_notifications_pending
    ON "pending_notifications" ("status", "available_at", "created_at");
CREATE INDEX IF NOT EXISTS idx_pending_notifications_supplier_id
    ON "pending_notifications" ("supplier_id");

-- ============================================================
-- 2. audit_events — reconcile 001 vs 002 schema
--    001: event_type VARCHAR(100), ip INET
--    002: event_type VARCHAR(64), ip VARCHAR(64)
--    Diff: 001 uses INET for ip (better), 002 has extra indexes.
--    Strategy: Add 002's missing indexes. Keep broader VARCHAR from 001.
-- ============================================================

-- Add indexes from 002 that 001 may be missing
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type
    ON "audit_events" ("event_type");
CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON "audit_events" ("actor_role", "actor_id");
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
    ON "audit_events" ("created_at" DESC);

-- ============================================================
-- 3. idempotency_keys — reconcile 001 vs 003 schema
--    Both define the same table with minor VARCHAR length diffs.
--    003 adds a status CHECK constraint.
--    Strategy: Ensure the CHECK constraint from 003 exists.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'idempotency_keys_status_valid'
        AND conrelid = 'idempotency_keys'::regclass
    ) THEN
        ALTER TABLE "idempotency_keys"
            ADD CONSTRAINT "idempotency_keys_status_valid"
            CHECK ("status" IN ('in_progress', 'completed'));
    END IF;
END $$;

COMMIT;
