// telegram-app-backend/createAdminHash.js
const bcrypt = require('bcrypt');
const { validatePassword } = require('./services/passwordPolicy');

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
const DISALLOWED_PLACEHOLDERS = new Set([
    'yoursecureadminpassword123!',
    'admin123',
    'password',
    'changeme'
]);

const getArgValue = (argv, flagName) => {
    const index = argv.findIndex((arg) => arg === flagName);
    if (index === -1) return null;
    return argv[index + 1] || null;
};

const getAdminPasswordInput = (argv = process.argv.slice(2), env = process.env) => {
    const cliPassword = getArgValue(argv, '--password');
    if (cliPassword) return cliPassword;
    return env.ADMIN_PLAIN_PASSWORD || null;
};

const assertSecureAdminPassword = (password) => {
    const normalized = String(password || '').trim();
    if (!normalized) {
        throw new Error('Missing admin password. Provide --password "<value>" or ADMIN_PLAIN_PASSWORD.');
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

const buildUsageMessage = () => [
    'Usage:',
    '  node createAdminHash.js --password <secure-value>',
    '  or set ADMIN_PLAIN_PASSWORD in your environment before running'
].join('\n');

const createAdminHash = async (password) => {
    const adminPassword = assertSecureAdminPassword(password);
    return bcrypt.hash(adminPassword, saltRounds);
};

const run = async () => {
    try {
        const password = getAdminPasswordInput();
        const hash = await createAdminHash(password);
        console.log('--- Admin Password Hash ---');
        console.log('Bcrypt Hash (Copy this into your database):');
        console.log(hash);
        console.log('-----------------------------');
        console.log('Now, go to your SQL editor and run an INSERT or UPDATE command.');
        console.log('Example INSERT for a new admin (replace email/full_name):');
        console.log(`INSERT INTO admins (email, password_hash, full_name, role) VALUES ('admin@example.com', '${hash}', 'Platform Super Admin', 'admin');`);
        console.log('\nExample UPDATE if admin user already exists:');
        console.log(`UPDATE admins SET password_hash = '${hash}' WHERE email = 'admin@example.com';`);
    } catch (error) {
        console.error('Failed to create admin password hash:', error.message);
        console.error(buildUsageMessage());
        process.exitCode = 1;
    }
};

if (require.main === module) {
    void run();
}

module.exports = {
    createAdminHash,
    getAdminPasswordInput,
    assertSecureAdminPassword,
    DISALLOWED_PLACEHOLDERS
};
