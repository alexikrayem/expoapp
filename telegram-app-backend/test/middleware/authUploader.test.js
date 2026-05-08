jest.mock('../../services/jwtService', () => ({
  verifyJwt: jest.fn(),
}));

const authUploader = require('../../middleware/authUploader');
const { verifyJwt } = require('../../services/jwtService');

describe('authUploader middleware', () => {
  let req;
  let res;
  let next;
  const originalEnforceFlag = process.env.ENFORCE_ACCOUNT_STATUS;

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

    global.mockDb.reset();
    verifyJwt.mockReset();

    process.env.JWT_ADMIN_SECRET = 'admin_secret';
    process.env.JWT_SUPPLIER_SECRET = 'supplier_secret';
    process.env.ENFORCE_ACCOUNT_STATUS = 'true';
  });

  afterEach(() => {
    process.env.ENFORCE_ACCOUNT_STATUS = originalEnforceFlag;
    jest.restoreAllMocks();
  });

  it('returns 401 when authorization header is missing', async () => {
    await authUploader(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authorization header missing or malformed.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('authorizes admin access tokens without querying supplier status', async () => {
    req = buildReq('Bearer admin-token');
    verifyJwt.mockImplementation((token, secret) => {
      if (token === 'admin-token' && secret === 'admin_secret') {
        return { adminId: 1, role: 'admin', type: 'access' };
      }
      throw new Error('unexpected secret');
    });

    await authUploader(req, res, next);

    expect(req.actor).toEqual({
      role: 'admin',
      payload: { adminId: 1, role: 'admin', type: 'access' },
    });
    expect(global.mockDb.query).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('authorizes active suppliers when account status enforcement is enabled', async () => {
    req = buildReq('Bearer supplier-token');
    verifyJwt.mockImplementation((token, secret) => {
      if (token === 'supplier-token' && secret === 'admin_secret') {
        throw new Error('not an admin token');
      }
      if (token === 'supplier-token' && secret === 'supplier_secret') {
        return { supplierId: 9, role: 'supplier', type: 'access' };
      }
      throw new Error('invalid');
    });
    global.mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: true }] });

    await authUploader(req, res, next);

    expect(global.mockDb.query).toHaveBeenCalledWith(
      'SELECT is_active FROM suppliers WHERE id = $1',
      [9]
    );
    expect(req.actor).toEqual({
      role: 'supplier',
      payload: { supplierId: 9, role: 'supplier', type: 'access' },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when supplier account is inactive', async () => {
    req = buildReq('Bearer supplier-token');
    verifyJwt.mockImplementation((token, secret) => {
      if (secret === 'admin_secret') {
        throw new Error('not admin');
      }
      return { supplierId: 44, role: 'supplier', type: 'access' };
    });
    global.mockDb.query.mockResolvedValueOnce({ rows: [{ is_active: false }] });

    await authUploader(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Supplier account is inactive.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('skips supplier status checks when account enforcement is disabled', async () => {
    process.env.ENFORCE_ACCOUNT_STATUS = 'false';
    req = buildReq('Bearer supplier-token');
    verifyJwt.mockImplementation((token, secret) => {
      if (secret === 'admin_secret') {
        throw new Error('not admin');
      }
      return { supplierId: 55, role: 'supplier', type: 'access' };
    });

    await authUploader(req, res, next);

    expect(global.mockDb.query).not.toHaveBeenCalled();
    expect(req.actor).toEqual({
      role: 'supplier',
      payload: { supplierId: 55, role: 'supplier', type: 'access' },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 for invalid token payloads', async () => {
    req = buildReq('Bearer invalid-payload');
    verifyJwt.mockReturnValue({ role: 'customer', type: 'access', userId: 1 });

    await authUploader(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid token.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when JWT verification fails for all candidate secrets', async () => {
    req = buildReq('Bearer broken-token');
    verifyJwt.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await authUploader(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid token.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
