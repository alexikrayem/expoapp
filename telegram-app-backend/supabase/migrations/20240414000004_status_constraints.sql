-- Status constraints (NOT VALID to avoid blocking existing data)
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_status_valid"
        CHECK ("status" IN (
            'pending',
            'processing',
            'confirmed',
            'shipped',
            'delivered',
            'completed',
            'cancelled',
            'refunded',
            'failed'
        )) NOT VALID;

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_delivery_status_valid"
        CHECK ("delivery_status" IN (
            'awaiting_fulfillment',
            'pending_pickup',
            'assigned_to_agent',
            'out_for_delivery',
            'delivered',
            'delivery_failed',
            'payment_pending',
            'cancelled',
            'failed'
        )) NOT VALID;

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_delivery_status_valid"
        CHECK ("delivery_item_status" IN (
            'pending_assignment',
            'assigned_to_agent',
            'out_for_delivery',
            'delivered',
            'delivery_failed',
            'payment_pending',
            'cancelled',
            'failed'
        )) NOT VALID;
