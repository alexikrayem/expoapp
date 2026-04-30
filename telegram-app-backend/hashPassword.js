// hashPassword.js
const bcrypt = require('bcrypt');
const { validatePassword } = require('./services/passwordPolicy');

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
const DISALLOWED_PLACEHOLDERS = new Set([
    'password',
    'changeme',
    '123456',
    'qwerty'
]);

const getArgValue = (argv, flagName) => {
    const index = argv.findIndex((arg) => arg === flagName);
    if (index === -1) return null;
    return argv[index + 1] || null;
};

const getPasswordInput = (argv = process.argv.slice(2), env = process.env) => {
    const cliPassword = getArgValue(argv, '--password');
    if (cliPassword) return cliPassword;
    return env.PLAIN_PASSWORD || env.HASH_PLAIN_PASSWORD || null;
};

const assertSecurePasswordInput = (password) => {
    const normalized = String(password || '').trim();
    if (!normalized) {
        throw new Error('Missing password. Provide --password "<value>" or PLAIN_PASSWORD/HASH_PLAIN_PASSWORD.');
    }

    if (DISALLOWED_PLACEHOLDERS.has(normalized.toLowerCase())) {
        throw new Error('Rejected insecure placeholder password. Choose a unique strong password.');
    }

    const passwordErrors = validatePassword(normalized);
    if (passwordErrors.length > 0) {
        throw new Error(`Password does not meet policy: ${passwordErrors.join('; ')}`);
    }

    return normalized;
};

const createPasswordHash = async (password) => {
    const securePassword = assertSecurePasswordInput(password);
    return bcrypt.hash(securePassword, saltRounds);
};

const buildUsageMessage = () => [
    'Usage:',
    '  node hashPassword.js --password <secure-value>',
    '  or set PLAIN_PASSWORD (or HASH_PLAIN_PASSWORD) in your environment before running'
].join('\n');

const run = async () => {
    try {
        const password = getPasswordInput();
        const hash = await createPasswordHash(password);
        console.log('Hashed Password:', hash);
    } catch (error) {
        console.error('Failed to create password hash:', error.message);
        console.error(buildUsageMessage());
        process.exitCode = 1;
    }
};

if (require.main === module) {
    void run();
}

module.exports = {
    createPasswordHash,
    getPasswordInput,
    assertSecurePasswordInput,
    DISALLOWED_PLACEHOLDERS
};
