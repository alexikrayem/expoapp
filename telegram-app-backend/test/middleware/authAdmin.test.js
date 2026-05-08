jest.mock('../../services/jwtService', () => ({
  verifyJwt: jest.fn(),
}));

const authAdmin = require('../../middleware/authAdmin');
const { verifyJwt } = require('../../services/jwtService');

describe('authAdmin middleware', () => {
  let req;
  let res;
  let next;

  const buildReq = (authorization) => ({
    headers: { authorization },
  });

  beforeEach(() => {
    req = buildReq(undefined);
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    verifyJwt.mockReset();
    process.env.JWT_ADMIN_SECRET = 'test_admin_secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 when authorization header is missing', () => {
    authAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Authorization header is missing or malformed. Expected "Bearer [token]".',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is malformed', () => {
    req = buildReq('Token test');

    authAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when admin secret is not configured', () => {
    req = buildReq('Bearer test-token');
    delete process.env.JWT_ADMIN_SECRET;

    authAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'JWT admin secret not configured.',
    });
    expect(verifyJwt).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when token type is not access', () => {
    req = buildReq('Bearer test-token');
    verifyJwt.mockReturnValue({
      adminId: 10,
      role: 'admin',
      type: 'refresh',
    });

    authAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden: invalid token type.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is not admin', () => {
    req = buildReq('Bearer test-token');
    verifyJwt.mockReturnValue({
      supplierId: 5,
      role: 'supplier',
      type: 'access',
    });

    authAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden: Access denied. Not an admin role.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('maps token expiry errors to 401', () => {
    req = buildReq('Bearer test-token');
    const tokenExpiredError = new Error('jwt expired');
    tokenExpiredError.name = 'TokenExpiredError';
    verifyJwt.mockImplementation(() => {
      throw tokenExpiredError;
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    authAdmin(req, res, next);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unauthorized: Token has expired.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('maps invalid JWT errors to 401', () => {
    req = buildReq('Bearer test-token');
    const jwtError = new Error('jwt malformed');
    jwtError.name = 'JsonWebTokenError';
    verifyJwt.mockImplementation(() => {
      throw jwtError;
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    authAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unauthorized: Invalid token.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('maps unexpected verification errors to 500', () => {
    req = buildReq('Bearer test-token');
    verifyJwt.mockImplementation(() => {
      throw new Error('unexpected');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    authAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error during token verification.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches decoded admin payload and calls next for valid access token', () => {
    req = buildReq('Bearer valid-admin-token');
    const decoded = {
      adminId: 1,
      email: 'admin@example.com',
      role: 'admin',
      type: 'access',
    };
    verifyJwt.mockReturnValue(decoded);

    authAdmin(req, res, next);

    expect(verifyJwt).toHaveBeenCalledWith('valid-admin-token', 'test_admin_secret');
    expect(req.admin).toEqual(decoded);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
