BEGIN;

CREATE TABLE IF NOT EXISTS pending_notifications (
    id BIGSERIAL PRIMARY KEY,
    notification_type TEXT NOT NULL,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_notifications_pending
    ON pending_notifications (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS idx_pending_notifications_order_id
    ON pending_notifications (order_id);

CREATE INDEX IF NOT EXISTS idx_pending_notifications_supplier_id
    ON pending_notifications (supplier_id);

COMMIT;
