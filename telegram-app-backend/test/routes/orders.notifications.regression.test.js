const request = require('../utils/request');
const express = require('express');

jest.mock('../../services/notificationQueue', () => ({
  enqueueOrderNotification: jest.fn(),
}));

jest.mock('../../services/telegramBot', () => ({
  sendOrderNotificationToDeliveryAgent: jest.fn(),
}));

const { enqueueOrderNotification } = require('../../services/notificationQueue');
const telegramBotService = require('../../services/telegramBot');
const ordersRoutes = require('../../routes/orders');

const normalizeSql = (sql) => String(sql || '').replace(/\s+/g, ' ').trim().toLowerCase();

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { userId: 1, role: 'customer' };
    next();
  });
  app.use('/api/orders', ordersRoutes);
  return app;
};

describe('Orders notification split regression', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    jest.clearAllMocks();
    app = buildApp();
    enqueueOrderNotification.mockResolvedValue(false);
    telegramBotService.sendOrderNotificationToDeliveryAgent.mockResolvedValue(true);
  });

  it('splits from-cart notification payloads per supplier without item leakage', async () => {
    const productRows = [
      { id: 101, name: 'Gauze', stock_level: 20, supplier_id: 10, effective_price: 10 },
      { id: 102, name: 'Syringe', stock_level: 20, supplier_id: 10, effective_price: 20 },
      { id: 201, name: 'Gloves', stock_level: 20, supplier_id: 20, effective_price: 5 },
    ];

    global.mockDb.query.mockImplementation((sql) => {
      const normalized = normalizeSql(sql);

      if (normalized.startsWith('select * from idempotency_keys')) {
        return Promise.resolve({ rows: [] });
      }
      if (normalized.startsWith('delete from idempotency_keys')) {
        return Promise.resolve({ rows: [] });
      }
      if (normalized.startsWith('insert into idempotency_keys')) {
        return Promise.resolve({ rows: [{ id: 77 }] });
      }
      if (normalized.startsWith('update idempotency_keys')) {
        return Promise.resolve({ rows: [] });
      }
      if (normalized === 'begin' || normalized === 'commit' || normalized === 'rollback') {
        return Promise.resolve({ rows: [] });
      }
      if (normalized.includes('from products p')) {
        return Promise.resolve({ rows: productRows });
      }
      if (normalized.includes('select address_line1 from user_profiles')) {
        return Promise.resolve({ rows: [{ address_line1: 'Customer Address' }] });
      }
      if (normalized.startsWith('insert into orders')) {
        return Promise.resolve({ rows: [{ id: 555 }] });
      }
      if (normalized.startsWith('insert into order_items')) {
        return Promise.resolve({ rows: [] });
      }
      if (normalized.startsWith('update products p')) {
        return Promise.resolve({ rows: [] });
      }
      if (
        normalized.includes('select full_name, phone_number, address_line1, address_line2, city') &&
        normalized.includes('from user_profiles')
      ) {
        return Promise.resolve({
          rows: [
            {
              full_name: 'Customer Name',
              phone_number: '0500000000',
              address_line1: 'Line 1',
              address_line2: 'Line 2',
              city: 'Damascus',
            },
          ],
        });
      }

      throw new Error(`Unexpected query in notification regression test: ${normalized}`);
    });

    const res = await request(app)
      .post('/api/orders/from-cart')
      .set('Idempotency-Key', 'notif-split-1')
      .send({
        items: [
          { product_id: 101, quantity: 2 },
          { product_id: 102, quantity: 1 },
          { product_id: 201, quantity: 3 },
        ],
      });

    expect(res.status).toBe(201);
    expect(enqueueOrderNotification).toHaveBeenCalledTimes(2);
    expect(telegramBotService.sendOrderNotificationToDeliveryAgent).toHaveBeenCalledTimes(2);

    const payloads = enqueueOrderNotification.mock.calls.map(([payload]) => payload);
    const payloadBySupplier = new Map(payloads.map((payload) => [payload.supplierId, payload]));

    expect(payloadBySupplier.get(10)).toMatchObject({
      orderId: 555,
      supplierId: 10,
      total_amount: 40,
      order_total_amount: 55,
    });
    expect(payloadBySupplier.get(10).items).toEqual(
      expect.arrayContaining([
        { product_name: 'Gauze', quantity: 2, price_at_time_of_order: 10 },
        { product_name: 'Syringe', quantity: 1, price_at_time_of_order: 20 },
      ])
    );

    expect(payloadBySupplier.get(20)).toMatchObject({
      orderId: 555,
      supplierId: 20,
      total_amount: 15,
      order_total_amount: 55,
    });
    expect(payloadBySupplier.get(20).items).toEqual([
      { product_name: 'Gloves', quantity: 3, price_at_time_of_order: 5 },
    ]);
  });
});
