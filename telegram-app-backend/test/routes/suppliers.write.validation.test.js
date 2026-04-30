const request = require('../utils/request');
const express = require('express');

jest.mock('../../middleware/authSupplier', () => (
  (req, res, next) => {
    req.supplier = { supplierId: 1 };
    next();
  }
));

const supplierRoutes = require('../../routes/suppliers');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/supplier', supplierRoutes);
  return app;
};

describe('Supplier write route validation', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('rejects invalid product create payload', async () => {
    const res = await request(app)
      .post('/api/supplier/products')
      .send({
        name: 'Mask',
        standardized_name_input: 'mask',
        price: 'abc',
        category: 'PPE',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(global.mockDb.query).not.toHaveBeenCalled();
  });

  it('rejects invalid city_ids payload', async () => {
    const res = await request(app)
      .put('/api/supplier/cities')
      .send({ city_ids: [1, 'bad-id'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(global.mockDb.query).not.toHaveBeenCalled();
  });

  it('rejects invalid delivery agent payload', async () => {
    const res = await request(app)
      .post('/api/supplier/delivery-agents')
      .send({
        full_name: 'Agent',
        phone_number: '0999123456',
        password: 'StrongPass123!',
        telegram_user_id: 'abc123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(global.mockDb.query).not.toHaveBeenCalled();
  });
});
