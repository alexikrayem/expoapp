const requireCustomer = require('../../middleware/requireCustomer');

describe('requireCustomer middleware', () => {
  it('rejects when no user is attached', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireCustomer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when role is not customer', () => {
    const req = { user: { userId: 1, role: 'admin' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireCustomer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: invalid user role.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows customer requests', () => {
    const req = { user: { userId: 1, role: 'customer' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireCustomer(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
