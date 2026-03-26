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

const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.post(
    '/test',
    (req, res, next) => {
      req.user = { userId: 42, role: 'customer' };
      next();
    },
    idempotency({ scope: 'test', requireKey: true }),
    (req, res) => {
      res.json({ ok: true, echo: req.body });
    }
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
});
