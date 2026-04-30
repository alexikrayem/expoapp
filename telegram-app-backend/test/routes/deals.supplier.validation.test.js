const request = require('../utils/request');
const express = require('express');

jest.mock('../../middleware/authSupplier', () => (
  (req, res, next) => {
    req.supplier = { supplierId: 1 };
    next();
  }
));

const dealsRoutes = require('../../routes/deals');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/deals', dealsRoutes);
  return app;
};

describe('Supplier deals write validation and ownership', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('rejects invalid discount_percentage on create', async () => {
    const res = await request(app)
      .post('/api/deals/supplier/deals')
      .send({ title: 'Deal', discount_percentage: 150 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(global.mockDb.query).not.toHaveBeenCalled();
  });

  it('rejects create when referenced product is not owned by supplier', async () => {
    global.mockDb.query.mockResolvedValueOnce({ rows: [] }); // product ownership check

    const res = await request(app)
      .post('/api/deals/supplier/deals')
      .send({ title: 'Deal', product_id: 99 });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not owned/i);
  });

  it('parses is_active=false string correctly on create', async () => {
    let insertedValues = null;
    global.mockDb.query.mockImplementation((sql, values = []) => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
      if (normalized.startsWith('select 1 from products where id = $1 and supplier_id = $2')) {
        return Promise.resolve({ rows: [{ '?column?': 1 }] });
      }
      if (normalized.startsWith('insert into deals')) {
        insertedValues = values;
        return Promise.resolve({ rows: [{ id: 321, is_active: values[7] }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/deals/supplier/deals')
      .send({ title: 'Deal', product_id: 5, is_active: 'false' });

    expect(res.status).toBe(201);
    expect(insertedValues).toBeDefined();
    expect(insertedValues[7]).toBe(false);
  });
});
