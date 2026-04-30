// utils/deliveryStateMachine.js

const ALLOWED_DELIVERY_STATUSES = new Set([
    'pending_assignment',
    'assigned_to_agent',
    'out_for_delivery',
    'delivered',
    'delivery_failed',
    'payment_pending',
    'failed',
    'cancelled'
]);

// Map of current status to an array of allowed next statuses
const STATUS_TRANSITIONS = {
    pending_assignment: ['assigned_to_agent', 'cancelled'],
    assigned_to_agent: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'delivery_failed', 'payment_pending', 'cancelled'],
    payment_pending: ['delivered', 'delivery_failed', 'cancelled'],
    // Terminal states cannot be transitioned out of by delivery agents
    delivered: [],
    delivery_failed: [],
    failed: [],
    cancelled: []
};

const isValidTransition = (currentStatus, nextStatus) => {
    if (!currentStatus || !nextStatus) return false;
    if (!ALLOWED_DELIVERY_STATUSES.has(nextStatus)) return false;
    
    // If status hasn't actually changed, that's fine (e.g. just updating notes)
    if (currentStatus === nextStatus) return true;
    
    const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus];
    if (!allowedNextStatuses) return false;
    
    return allowedNextStatuses.includes(nextStatus);
};

module.exports = {
    ALLOWED_DELIVERY_STATUSES,
    STATUS_TRANSITIONS,
    isValidTransition
};
