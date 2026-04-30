const bcrypt = require('bcrypt');

const {
  createAdminHash,
  getAdminPasswordInput,
  assertSecureAdminPassword,
} = require('../../createAdminHash');

const {
  createPasswordHash,
  getPasswordInput,
  assertSecurePasswordInput,
} = require('../../hashPassword');

describe('password hash helper scripts hardening', () => {
  describe('createAdminHash', () => {
    it('prefers CLI admin password over env password', () => {
      const argv = ['--password', 'CliAdminPass123!'];
      const env = { ADMIN_PLAIN_PASSWORD: 'EnvAdminPass123!' };

      expect(getAdminPasswordInput(argv, env)).toBe('CliAdminPass123!');
    });

    it('rejects insecure placeholder admin passwords', () => {
      expect(() => assertSecureAdminPassword('admin123')).toThrow(
        /Rejected insecure placeholder password/i
      );
    });

    it('creates bcrypt hash for valid admin password', async () => {
      const plain = 'StrongAdminPass123!';
      const hash = await createAdminHash(plain);

      expect(hash).toMatch(/^\$2[aby]\$.+/);
      await expect(bcrypt.compare(plain, hash)).resolves.toBe(true);
    });
  });

  describe('hashPassword', () => {
    it('accepts fallback env variable when CLI flag is absent', () => {
      const argv = [];
      const env = { HASH_PLAIN_PASSWORD: 'EnvGenericPass123!' };

      expect(getPasswordInput(argv, env)).toBe('EnvGenericPass123!');
    });

    it('rejects insecure generic placeholders', () => {
      expect(() => assertSecurePasswordInput('123456')).toThrow(
        /Rejected insecure placeholder password/i
      );
    });

    it('creates bcrypt hash for valid generic password', async () => {
      const plain = 'StrongGenericPass123!';
      const hash = await createPasswordHash(plain);

      expect(hash).toMatch(/^\$2[aby]\$.+/);
      await expect(bcrypt.compare(plain, hash)).resolves.toBe(true);
    });
  });
});
