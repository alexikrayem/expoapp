const crypto = require('crypto');
const requestIdMiddleware = require('../../middleware/requestId');

describe('requestId middleware', () => {
  let req;
  let res;
  let next;

  const buildReq = (headerValue) => ({
    get: jest.fn((name) => {
      if (name === 'X-Request-ID') return headerValue;
      return undefined;
    }),
  });

  beforeEach(() => {
    req = buildReq(undefined);
    res = {
      set: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses a valid client-provided request id', () => {
    req = buildReq('req-abc-123');
    const randomSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id');

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('req-abc-123');
    expect(res.set).toHaveBeenCalledWith('X-Request-ID', 'req-abc-123');
    expect(randomSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new request id when the header is missing', () => {
    const randomSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('generated-id');

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('generated-id');
    expect(res.set).toHaveBeenCalledWith('X-Request-ID', 'generated-id');
    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new request id when the provided value is invalid', () => {
    req = buildReq('bad id with spaces!');
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('fallback-id');

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('fallback-id');
    expect(res.set).toHaveBeenCalledWith('X-Request-ID', 'fallback-id');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
