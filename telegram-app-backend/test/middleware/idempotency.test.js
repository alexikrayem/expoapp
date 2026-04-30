const request = require('../utils/request');
const express = require('express');
const crypto = require('crypto');

const { idempotency } = require('../../middleware/idempotency');

const stableStringify = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
};

const hashRequest = (method, url, body) => {
  const payload = `${method}|${url}|${stableStringify(body || {})}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

const buildApp = (handler = (req, res) => {
  res.json({ ok: true, echo: req.body });
}) => {
  const app = express();
  app.use(express.json());

  app.post(
    '/test',
    (req, res, next) => {
      req.user = { userId: 42, role: 'customer' };
      next();
    },
    idempotency({ scope: 'test', requireKey: true }),
    handler
  );

  return app;
};

describe('Idempotency middleware', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = buildApp();
  });

  it('rejects missing Idempotency-Key when required', async () => {
    const res = await request(app).post('/test').send({ foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Idempotency-Key header is required');
    expect(global.mockDb.query).not.toHaveBeenCalled();
  });

  it('stores and completes a new idempotent request', async () => {
    global.mockDb.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM idempotency_keys')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('DELETE FROM idempotency_keys')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('INSERT INTO idempotency_keys')) {
        return Promise.resolve({ rows: [{ id: 1 }] });
      }
      if (sql.includes('UPDATE idempotency_keys')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'abc-123')
      .send({ foo: 'bar' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, echo: { foo: 'bar' } });
  });

  it('replays a completed response for the same key and payload', async () => {
    const requestBody = { foo: 'bar' };
    const requestHash = hashRequest('POST', '/test', requestBody);

    global.mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          id: 9,
          status: 'completed',
          request_hash: requestHash,
          response_status: 201,
          response_body: { ok: true, echo: { foo: 'bar' } },
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'abc-123')
      .send(requestBody);

    expect(res.status).toBe(201);
    expect(res.headers['idempotency-replay']).toBe('true');
    expect(res.body).toEqual({ ok: true, echo: { foo: 'bar' } });
  });

  it('rejects reuse with a different payload', async () => {
    global.mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          status: 'completed',
          request_hash: 'mismatch-hash',
          response_status: 200,
          response_body: { ok: true },
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'abc-123')
      .send({ foo: 'different' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Idempotency-Key reuse with different request payload');
  });

  it('rejects in-progress requests that are not stale', async () => {
    const requestBody = { foo: 'bar' };
    const requestHash = hashRequest('POST', '/test', requestBody);

    global.mockDb.query.mockResolvedValueOnce({
      rows: [
        {
          id: 11,
          status: 'in_progress',
          request_hash: requestHash,
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'abc-123')
      .send(requestBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Request is already in progress');
  });

  it('allows retry for the same key after a 5xx response', async () => {
    let shouldFail = true;
    app = buildApp((req, res) => {
      if (shouldFail) {
        shouldFail = false;
        return res.status(500).json({ error: 'transient failure' });
      }
      return res.status(201).json({ ok: true, echo: req.body });
    });

    let record = null;
    global.mockDb.query.mockImplementation((sql, params = []) => {
      const normalizedSql = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();

      if (normalizedSql.startsWith('select * from idempotency_keys')) {
        return Promise.resolve({ rows: record ? [{ ...record }] : [] });
      }

      if (normalizedSql.startsWith('delete from idempotency_keys')) {
        return Promise.resolve({ rows: [] });
      }

      if (normalizedSql.startsWith('insert into idempotency_keys')) {
        record = {
          id: 1,
          status: 'in_progress',
          request_hash: params[3],
          created_at: new Date().toISOString(),
        };
        return Promise.resolve({ rows: [{ id: 1 }] });
      }

      if (normalizedSql.includes("set status = 'failed'")) {
        record = { ...record, status: 'failed' };
        return Promise.resolve({ rows: [] });
      }

      if (normalizedSql.includes("set status = 'in_progress'")) {
        record = { ...record, status: 'in_progress' };
        return Promise.resolve({ rows: [] });
      }

      if (normalizedSql.includes("set status = 'completed'")) {
        record = {
          ...record,
          status: 'completed',
          response_status: params[0],
          response_body: params[1],
        };
        return Promise.resolve({ rows: [] });
      }

      return Promise.resolve({ rows: [] });
    });

    const first = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'retry-on-error')
      .send({ foo: 'bar' });

    expect(first.status).toBe(500);

    await new Promise((resolve) => setImmediate(resolve));

    const second = await request(app)
      .post('/test')
      .set('Idempotency-Key', 'retry-on-error')
      .send({ foo: 'bar' });

    expect(second.status).toBe(201);
    expect(second.headers['idempotency-replay']).toBeUndefined();
    expect(second.body).toEqual({ ok: true, echo: { foo: 'bar' } });
  });
});
