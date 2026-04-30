const request = require('../utils/request');
const express = require('express');

const userRoutes = require('../../routes/user');

const normalizeSql = (sql) => String(sql || '').replace(/\s+/g, ' ').trim().toLowerCase();

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { userId: 44, role: 'customer' };
    next();
  });
  app.use('/api/user', userRoutes);
  return app;
};

describe('User profile upsert regression', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('does not coerce omitted optional fields to empty strings during profile upsert', async () => {
    let capturedUpsertValues = null;

    global.mockDb.query.mockImplementation((sql, values = []) => {
      const normalized = normalizeSql(sql);

      if (normalized.includes('insert into user_profiles')) {
        capturedUpsertValues = values;
        return Promise.resolve({ rows: [{ user_id: 44 }] });
      }

      if (normalized.includes('select up.*, c.name as selected_city_name') && normalized.includes('from user_profiles up')) {
        return Promise.resolve({
          rows: [
            {
              user_id: 44,
              full_name: 'Updated Name',
              phone_number: '0999000000',
              address_line1: 'Existing Address',
              city: 'Damascus',
              selected_city_name: 'Damascus',
            },
          ],
        });
      }

      throw new Error(`Unexpected query in user upsert regression test: ${normalized}`);
    });

    const res = await request(app)
      .put('/api/user/profile')
      .send({ full_name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(capturedUpsertValues).toBeDefined();
    expect(capturedUpsertValues[2]).toBe('Updated Name');
    expect(capturedUpsertValues[3]).toBeNull();
    expect(capturedUpsertValues[4]).toBeNull();
    expect(capturedUpsertValues[6]).toBeNull();
    expect(capturedUpsertValues[7]).toBeNull();
    expect(capturedUpsertValues[8]).toBeNull();
  });
});
