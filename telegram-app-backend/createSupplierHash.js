// telegram-app-backend/createSupplierHash.js
const bcrypt = require('bcrypt');
const { validatePassword } = require('./services/passwordPolicy');

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
const DISALLOWED_PLACEHOLDERS = new Set([
    'supplier123',
    'yoursecuresupplierpassword123!',
    'password',
    'changeme'
]);

const getArgValue = (argv, flagName) => {
    const index = argv.findIndex((arg) => arg === flagName);
    if (index === -1) return null;
    return argv[index + 1] || null;
};

const getSupplierPasswordInput = (argv = process.argv.slice(2), env = process.env) => {
    const cliPassword = getArgValue(argv, '--password');
    if (cliPassword) return cliPassword;
    return env.SUPPLIER_PLAIN_PASSWORD || null;
};

const assertSecureSupplierPassword = (password) => {
    const normalized = String(password || '').trim();
    if (!normalized) {
        throw new Error('Missing supplier password. Provide --password "<value>" or SUPPLIER_PLAIN_PASSWORD.');
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
    '  node createSupplierHash.js --password <secure-value>',
    '  or set SUPPLIER_PLAIN_PASSWORD in your environment before running'
].join('\n');

const createSupplierHash = async (password) => {
    const supplierPassword = assertSecureSupplierPassword(password);
    return bcrypt.hash(supplierPassword, saltRounds);
};

const run = async () => {
    try {
        const password = getSupplierPasswordInput();
        const hash = await createSupplierHash(password);
        console.log('--- Supplier Password Hash ---');
        console.log('Bcrypt Hash (Copy this into your database):');
        console.log(hash);
        console.log('-----------------------------');
        console.log('Now, go to your database and run an INSERT or UPDATE command.');
        console.log('Example INSERT for a new supplier:');
        console.log(`INSERT INTO suppliers (name, email, password_hash, category, is_active) VALUES ('Test Supplier', 'supplier@test.com', '${hash}', 'Medicine', true);`);
        console.log('\nExample UPDATE if supplier already exists:');
        console.log(`UPDATE suppliers SET password_hash = '${hash}' WHERE email = 'supplier@test.com';`);
    } catch (error) {
        console.error('Failed to create supplier password hash:', error.message);
        console.error(buildUsageMessage());
        process.exitCode = 1;
    }
};

if (require.main === module) {
    void run();
}

module.exports = {
    createSupplierHash,
    getSupplierPasswordInput,
    assertSecureSupplierPassword,
    DISALLOWED_PLACEHOLDERS
};
