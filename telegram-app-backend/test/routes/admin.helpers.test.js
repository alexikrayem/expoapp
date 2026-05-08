jest.mock('../../services/tokenService', () => ({
  revokeAllForSubject: jest.fn(),
}));

const { revokeSupplierSessions } = require('../../routes/admin.helpers');
const { revokeAllForSubject } = require('../../services/tokenService');

describe('admin.helpers', () => {
  beforeEach(() => {
    global.mockDb.reset();
    revokeAllForSubject.mockReset();
  });

  it('does nothing when supplier id is missing', async () => {
    await revokeSupplierSessions(undefined);

    expect(revokeAllForSubject).not.toHaveBeenCalled();
    expect(global.mockDb.query).not.toHaveBeenCalled();
  });

  it('revokes supplier sessions and stops when no delivery agents are found', async () => {
    global.mockDb.query.mockResolvedValueOnce({ rows: [] });

    await revokeSupplierSessions(77);

    expect(revokeAllForSubject).toHaveBeenCalledTimes(1);
    expect(revokeAllForSubject).toHaveBeenCalledWith(77, 'supplier');
    expect(global.mockDb.query).toHaveBeenCalledWith(
      'SELECT id FROM delivery_agents WHERE supplier_id = $1',
      [77]
    );
  });

  it('revokes supplier sessions and all delivery-agent sessions', async () => {
    global.mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 11 }, { id: 12 }, { id: 13 }],
    });

    await revokeSupplierSessions(88);

    expect(revokeAllForSubject).toHaveBeenCalledTimes(4);
    expect(revokeAllForSubject).toHaveBeenNthCalledWith(1, 88, 'supplier');
    expect(revokeAllForSubject).toHaveBeenCalledWith(11, 'delivery_agent');
    expect(revokeAllForSubject).toHaveBeenCalledWith(12, 'delivery_agent');
    expect(revokeAllForSubject).toHaveBeenCalledWith(13, 'delivery_agent');
  });
});
