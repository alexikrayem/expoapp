const request = require('../utils/request');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mount routes
  const authRoutes = require('../../routes/auth');
  app.use('/api/auth', authRoutes);

  return app;
};

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    app = createTestApp();
  });

  describe('POST /api/auth/supplier/login', () => {
    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/supplier/login')
        .send({ password: 'test123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/supplier/login')
        .send({ email: 'not-an-email', password: 'test123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/supplier/login')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('returns 401 for non-existent supplier', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/supplier/login')
        .send({ email: 'test@example.com', password: 'test123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns tokens for valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'supplier@test.com',
          password_hash: hashedPassword,
          name: 'Test Supplier',
          category: 'Medical',
          location: 'Damascus'
        }]
      });

      const res = await request(app)
        .post('/api/auth/supplier/login')
        .send({ email: 'supplier@test.com', password: 'correctpassword' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.supplier.email).toBe('supplier@test.com');
    });
  });

  describe('POST /api/auth/admin/login', () => {
    it('returns 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 for invalid admin credentials', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@test.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/send-otp', () => {
    it('returns 400 for missing phone number', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
    });

    it('creates OTP for valid phone number', async () => {
      // Mock finding no existing user (new user)
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });
      // Mock OTP cleanup
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });
      // Mock OTP insert
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone_number: '+963912345678' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('returns 400 for missing phone or code', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone_number: '+963912345678' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid OTP', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] }); // No matching OTP

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone_number: '+963912345678', code: '654321' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates refresh token and returns new tokens', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, role: 'customer', type: 'refresh', jti: 'test-jti' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // select existing token hash
        .mockResolvedValueOnce({ rows: [] }) // insert new refresh token
        .mockResolvedValueOnce({ rows: [] }); // insert legacy revoked row

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('rejects reused refresh token and revokes sessions', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, role: 'customer', type: 'refresh', jti: 'test-jti' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              revoked_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // revokeAllForSubject

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(403);
    });
  });
});
