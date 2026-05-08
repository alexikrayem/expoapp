jest.mock('../../middleware/authDeliveryAgent', () =>
  jest.fn((req, _res, next) => {
    req.deliveryAgent = { deliveryAgentId: 42, role: 'delivery_agent' };
    next();
  })
);

const mockIsValidTransition = jest.fn();

jest.mock('../../utils/deliveryStateMachine', () => ({
  ALLOWED_DELIVERY_STATUSES: new Set([
    'assigned_to_agent',
    'out_for_delivery',
    'delivered',
    'failed',
  ]),
  isValidTransition: (...args) => mockIsValidTransition(...args),
}));

jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const express = require('express');
const request = require('../utils/request');
const logger = require('../../services/logger');
const deliveryRoutes = require('../../routes/delivery');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/delivery', deliveryRoutes);
  return app;
};

describe('Delivery routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    global.mockDb.reset();
    mockIsValidTransition.mockReset();
    logger.error.mockReset();
    if (global.mockDb.pool?.connect?.mockClear) {
      global.mockDb.pool.connect.mockClear();
    }
  });

  describe('GET /api/delivery/assigned-items', () => {
    it('returns 400 for invalid status filters', async () => {
      const res = await request(app)
        .get('/api/delivery/assigned-items')
        .query({ statuses: 'assigned_to_agent,not-real-status' });

      expect(res.status).toBe(400);
      expect(String(res.body.error)).toContain('Invalid status filter(s): not-real-status');
      expect(global.mockDb.query).not.toHaveBeenCalled();
    });

    it('returns assigned items with pagination metadata', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [
            { order_item_id: 1, order_id: 100, product_name: 'Product A' },
            { order_item_id: 2, order_id: 101, product_name: 'Product B' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ total: '7' }],
        });

      const res = await request(app)
        .get('/api/delivery/assigned-items')
        .query({ page: 2, statuses: 'assigned_to_agent,out_for_delivery' });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.currentPage).toBe(2);
      expect(res.body.totalPages).toBe(1);
      expect(res.body.totalItems).toBe(7);
      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE oi.assigned_delivery_agent_id = $1'),
        [42, ['assigned_to_agent', 'out_for_delivery'], 20, 20]
      );
    });

    it('returns 500 when assigned-item query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('assigned query failed'));

      const res = await request(app).get('/api/delivery/assigned-items');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch assigned items' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching assigned items',
        expect.any(Error)
      );
    });
  });

  describe('PUT /api/delivery/order-items/:orderItemId/status', () => {
    it('returns 404 when item is not assigned to this delivery agent', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // verify query
        .mockResolvedValueOnce({}); // ROLLBACK
      mockIsValidTransition.mockReturnValue(true);

      const res = await request(app)
        .put('/api/delivery/order-items/5/status')
        .send({ newStatus: 'out_for_delivery' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Order item not found or not assigned to you' });
      expect(global.mockDb.client.release).toHaveBeenCalled();
    });

    it('returns 400 for invalid status transitions', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 5, delivery_item_status: 'assigned_to_agent' }],
        }) // verify
        .mockResolvedValueOnce({}); // ROLLBACK
      mockIsValidTransition.mockReturnValue(false);

      const res = await request(app)
        .put('/api/delivery/order-items/5/status')
        .send({ newStatus: 'delivered' });

      expect(res.status).toBe(400);
      expect(String(res.body.error)).toContain('Cannot transition status from assigned_to_agent to delivered');
    });

    it('updates status and commits transaction on valid transition', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 5, delivery_item_status: 'assigned_to_agent' }],
        }) // verify
        .mockResolvedValueOnce({
          rows: [{ id: 5, delivery_item_status: 'out_for_delivery', delivery_notes: 'Picked up' }],
        }) // update
        .mockResolvedValueOnce({}); // COMMIT
      mockIsValidTransition.mockReturnValue(true);

      const res = await request(app)
        .put('/api/delivery/order-items/5/status')
        .send({
          newStatus: 'out_for_delivery',
          notes: 'Picked up',
          paymentCollected: true,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 5,
        delivery_item_status: 'out_for_delivery',
        delivery_notes: 'Picked up',
      });
      expect(global.mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE order_items'),
        ['out_for_delivery', 'Picked up', true, '5']
      );
    });

    it('returns 500 when status update transaction fails unexpectedly', async () => {
      global.mockDb.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('verify failed')) // verify
        .mockResolvedValueOnce({}); // ROLLBACK
      mockIsValidTransition.mockReturnValue(true);

      const res = await request(app)
        .put('/api/delivery/order-items/5/status')
        .send({ newStatus: 'out_for_delivery' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to update order item status' });
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating order item status',
        expect.any(Error)
      );
      expect(global.mockDb.client.release).toHaveBeenCalled();
    });
  });
});
