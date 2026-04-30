describe('Logger sanitization', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('sanitizes sensitive values in development log output', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();

    const logger = require('../../services/logger');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('Test log', {
      accessToken: 'secret-token',
      refresh_token: 'refresh-secret',
      email: 'doctor@example.com',
      phone_number: '+963912345678',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = String(logSpy.mock.calls[0][0]);

    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret-token');
    expect(output).not.toContain('refresh-secret');
    expect(output).not.toContain('doctor@example.com');
    expect(output).not.toContain('+963912345678');
  });
});
