const bcrypt = require('bcrypt');

const {
  createSupplierHash,
  getSupplierPasswordInput,
  assertSecureSupplierPassword,
} = require('../../createSupplierHash');

describe('createSupplierHash hardening', () => {
  it('prefers CLI password over env password', () => {
    const argv = ['--password', 'CliStrongPass123!'];
    const env = { SUPPLIER_PLAIN_PASSWORD: 'EnvStrongPass123!' };

    const password = getSupplierPasswordInput(argv, env);

    expect(password).toBe('CliStrongPass123!');
  });

  it('falls back to SUPPLIER_PLAIN_PASSWORD when CLI flag is absent', () => {
    const argv = [];
    const env = { SUPPLIER_PLAIN_PASSWORD: 'EnvStrongPass123!' };

    const password = getSupplierPasswordInput(argv, env);

    expect(password).toBe('EnvStrongPass123!');
  });

  it('rejects insecure placeholder supplier passwords', () => {
    expect(() => assertSecureSupplierPassword('supplier123')).toThrow(
      /Rejected insecure placeholder password/i
    );
  });

  it('rejects passwords that fail password policy', () => {
    expect(() => assertSecureSupplierPassword('weakpass')).toThrow(
      /Password does not meet policy/i
    );
  });

  it('creates a bcrypt hash for policy-compliant password', async () => {
    const strongPassword = 'StrongSupplierPass123!';

    const hash = await createSupplierHash(strongPassword);

    expect(hash).toMatch(/^\$2[aby]\$.+/);
    const matches = await bcrypt.compare(strongPassword, hash);
    expect(matches).toBe(true);
  });
});
