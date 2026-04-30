const jwt = require('jsonwebtoken');

describe('JWT Auth Middleware', () => {
  let req, res, next;

  // Helper to create mock request with Express-like header method
  const createMockReq = (headers = {}) => ({
    headers,
    ip: '127.0.0.1',
    header: function (name) {
      return this.headers[name.toLowerCase()];
    }
  });

  beforeEach(() => {
    req = createMockReq();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    process.env.JWT_SECRET = 'test_secret';
  });

  it('should reject missing authorization header', () => {
    req = createMockReq({});

    const { validateTelegramAuth } = require('../../middleware/authMiddleware');
    validateTelegramAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject invalid authorization header format', () => {
    req = createMockReq({
      'authorization': 'InvalidToken'
    });

    const { validateTelegramAuth } = require('../../middleware/authMiddleware');
    validateTelegramAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject invalid JWT token', () => {
    req = createMockReq({
      'authorization': 'Bearer invalid_token'
    });

    const { validateTelegramAuth } = require('../../middleware/authMiddleware');
    validateTelegramAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept valid JWT token', () => {
    const validToken = jwt.sign(
      { userId: 123456, telegramId: 123456, role: 'customer', type: 'access' },
      process.env.JWT_SECRET
    );

    req = createMockReq({
      'authorization': `Bearer ${validToken}`
    });

    const { validateTelegramAuth } = require('../../middleware/authMiddleware');
    validateTelegramAuth(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe(123456);
    expect(next).toHaveBeenCalled();
  });
});
