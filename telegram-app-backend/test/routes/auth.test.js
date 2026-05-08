const request = require('../utils/request');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const hashOtpForTest = (phone, code) =>
  crypto
    .createHmac('sha256', process.env.OTP_HASH_SECRET)
    .update(`${phone}:${String(code || '').trim()}`)
    .digest('hex');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount routes
  const authRoutes = require('../../routes/auth');
  app.use('/api/auth', authRoutes);

  return app;
};

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    global.mockDb.reset();
    process.env.OTP_HASH_SECRET = 'test_otp_secret';
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    delete process.env.EXPOSE_OTP;
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
      expect(res.body.refreshToken).toBeUndefined();
      expect(String(res.headers['set-cookie'] || '')).toContain('refreshToken=');
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

    it('returns 401 when password is incorrect', async () => {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('correct-password', 10);

      global.mockDb.query.mockResolvedValue({ rows: [] });
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 77,
          email: 'admin@test.com',
          full_name: 'Admin User',
          role: 'admin',
          password_hash: passwordHash,
        }],
      });

      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@test.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });

    it('returns access token and admin payload for valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('correct-password', 10);

      global.mockDb.query.mockResolvedValue({ rows: [] });
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 10,
          email: 'admin@test.com',
          full_name: 'Admin User',
          role: 'admin',
          password_hash: passwordHash,
        }],
      });

      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@test.com', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.admin).toEqual({
        id: 10,
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
      });
      expect(String(res.headers['set-cookie'] || '')).toContain('refreshToken=');
    });
  });

  describe('POST /api/auth/delivery/login', () => {
    it('returns 401 when delivery agent is not found', async () => {
      global.mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/delivery/login')
        .send({ phoneNumber: '+963955111222', password: 'any-pass' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });

    it('returns 401 when delivery password is incorrect', async () => {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('correct-delivery-pass', 10);

      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 5,
          supplier_id: 11,
          full_name: 'Delivery Agent',
          phone_number: '+963955111222',
          password_hash: passwordHash,
          is_active: true,
        }],
      });

      const res = await request(app)
        .post('/api/auth/delivery/login')
        .send({ phoneNumber: '+963955111222', password: 'wrong-delivery-pass' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });

    it('returns delivery access token for valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('correct-delivery-pass', 10);

      global.mockDb.query.mockResolvedValue({ rows: [] });
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 5,
          supplier_id: 11,
          full_name: 'Delivery Agent',
          phone_number: '+963955111222',
          password_hash: passwordHash,
          is_active: true,
        }],
      });

      const res = await request(app)
        .post('/api/auth/delivery/login')
        .send({ phoneNumber: '+963955111222', password: 'correct-delivery-pass' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.agent).toEqual({
        id: 5,
        name: 'Delivery Agent',
        phone: '+963955111222',
        supplierId: 11,
      });
      expect(String(res.headers['set-cookie'] || '')).toContain('refreshToken=');
    });

    it('returns 500 when delivery login query fails', async () => {
      global.mockDb.query.mockRejectedValueOnce(new Error('delivery lookup failed'));

      const res = await request(app)
        .post('/api/auth/delivery/login')
        .send({ phoneNumber: '+963955111222', password: 'correct-delivery-pass' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
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
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone_number: ' 00963 912-345-678 ' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();

      const [sql, params] = global.mockDb.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO otp_verifications');
      expect(params[0]).toBe('+963912345678');
      expect(params[1]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns 400 when phone number format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone_number: '+++' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid phone number format' });
    });

    it('exposes OTP in non-production when EXPOSE_OTP is true', async () => {
      process.env.EXPOSE_OTP = 'true';
      global.mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone_number: '00963 911 123 456' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('OTP sent successfully');
      expect(String(res.body.dev_code)).toMatch(/^\d{6}$/);
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

    it('returns 429 when OTP attempt limit is reached', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          code: '123456',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          attempts: 5,
        }],
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone_number: '+963912345678', code: '123456' });

      expect(res.status).toBe(429);
      expect(res.body).toEqual({ error: 'Too many failed attempts. Please request a new code.' });
    });

    it('returns 400 when OTP is expired', async () => {
      global.mockDb.query.mockResolvedValueOnce({
        rows: [{
          code: '123456',
          expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
          attempts: 0,
        }],
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone_number: '+963912345678', code: '123456' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'OTP expired. Please request a new one.' });
    });

    it('increments attempts and returns 400 when OTP code is incorrect', async () => {
      const normalizedPhone = '+963912345678';
      const storedHash = hashOtpForTest(normalizedPhone, '222222');

      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            code: storedHash,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            attempts: 0,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone_number: normalizedPhone, code: '111111' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid code' });
      expect(global.mockDb.query.mock.calls[1][0]).toContain('UPDATE otp_verifications SET attempts = attempts +');
    });

    it('returns isNew=true when OTP is valid and profile does not exist', async () => {
      const normalizedPhone = '+963912345678';
      const code = '654321';
      const hashedCode = hashOtpForTest(normalizedPhone, code);

      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            code: hashedCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            attempts: 0,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone_number: '00963 912 345 678', code });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        isNew: true,
        phone_number: normalizedPhone,
      });
    });

    it('accepts hashed OTP and logs in existing user', async () => {
      const normalizedPhone = '+963912345678';
      const submittedCode = '654321';
      const hashedCode = hashOtpForTest(normalizedPhone, submittedCode);

      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            code: hashedCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            attempts: 0
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            user_id: 42,
            full_name: 'Test User',
            phone_number: normalizedPhone,
            address_line1: 'Main St',
            city: 'Damascus'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // refresh token insert
        .mockResolvedValueOnce({ rows: [] }); // OTP delete

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone_number: '00963 912 345 678', code: submittedCode });

      expect(res.status).toBe(200);
      expect(res.body.isNew).toBe(false);
      expect(res.body.accessToken).toBeDefined();
      expect(global.mockDb.query.mock.calls[0][1]).toEqual([normalizedPhone]);
    });
  });

  describe('POST /api/auth/register-phone', () => {
    const validProfileData = {
      full_name: 'User Name',
      address_line1: 'Main Street',
      city: 'Damascus',
    };

    it('returns 409 when user already exists for phone number', async () => {
      const normalizedPhone = '+963912345678';
      const code = '222222';
      const hashedCode = hashOtpForTest(normalizedPhone, code);

      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            code: hashedCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          }],
        })
        .mockResolvedValueOnce({ rows: [{ exists: 1 }] });

      const res = await request(app)
        .post('/api/auth/register-phone')
        .send({
          phone_number: normalizedPhone,
          code,
          profileData: validProfileData,
        });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'User already exists with this phone number.' });
    });

    it('registers new user and returns tokens when OTP is valid', async () => {
      const normalizedPhone = '+963912345678';
      const code = '333333';
      const hashedCode = hashOtpForTest(normalizedPhone, code);
      const createdUser = {
        user_id: 123456,
        full_name: validProfileData.full_name,
        phone_number: normalizedPhone,
        address_line1: validProfileData.address_line1,
        city: validProfileData.city,
      };

      global.mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            code: hashedCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createdUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/register-phone')
        .send({
          phone_number: '00963 912 345 678',
          code,
          profileData: validProfileData,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.userProfile).toMatchObject({
        user_id: createdUser.user_id,
        phone_number: normalizedPhone,
      });
      expect(String(res.headers['set-cookie'] || '')).toContain('refreshToken=');
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
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // select existing token hash
        .mockResolvedValueOnce({ rows: [] }) // insert new refresh token
        .mockResolvedValueOnce({ rows: [] }) // insert legacy revoked row
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(String(res.headers['set-cookie'] || '')).toContain('refreshToken=');
    });

    it('rejects cookie-auth refresh without CSRF header', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, role: 'customer', type: 'refresh', jti: 'csrf-jti' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', `refreshToken=${refreshToken}; csrfToken=test-csrf-token`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });

    it('allows cookie-auth refresh with valid origin and CSRF token', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, role: 'customer', type: 'refresh', jti: 'csrf-pass-jti' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // select existing token hash
        .mockResolvedValueOnce({ rows: [] }) // insert new refresh token
        .mockResolvedValueOnce({ rows: [] }); // insert legacy revoked row

      const csrfToken = 'test-csrf-token';
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Origin', 'http://localhost:3000')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', `refreshToken=${refreshToken}; csrfToken=${csrfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects reused refresh token and revokes sessions', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, role: 'customer', type: 'refresh', jti: 'test-jti' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      global.mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              revoked_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // revokeAllForSubject
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('rejects cookie-auth logout without CSRF header', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, role: 'customer', type: 'refresh', jti: 'logout-csrf-jti' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', `refreshToken=${refreshToken}; csrfToken=logout-csrf-token`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });

    it('allows cookie-auth logout with valid origin and CSRF token', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, role: 'customer', type: 'refresh', jti: 'logout-jti' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      global.mockDb.query.mockResolvedValueOnce({ rows: [] }); // revoke refresh token

      const csrfToken = 'logout-csrf-token';
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', 'http://localhost:3000')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', `refreshToken=${refreshToken}; csrfToken=${csrfToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');
      expect(String(res.headers['set-cookie'] || '')).toContain('refreshToken=');
      expect(String(res.headers['set-cookie'] || '')).toContain('csrfToken=');
    });
  });
});
