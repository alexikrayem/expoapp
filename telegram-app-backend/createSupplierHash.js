// telegram-app-backend/createSupplierHash.js
const bcrypt = require('bcrypt');
const saltRounds = 10;

// --- CHOOSE YOUR SUPPLIER PASSWORD HERE ---
const supplierPlainPassword = 'supplier123'; // Change this to your desired password
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// IMPORTANT: Replace this with a strong password for your supplier account.

if (!supplierPlainPassword || supplierPlainPassword === 'supplier123') {
    console.error("WARNING: Please set a strong supplierPlainPassword in createSupplierHash.js");
    console.error("Current password is the default - change it for security!");
}

bcrypt.hash(supplierPlainPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    console.log('--- Supplier Password Hash ---');
    console.log('Plain Password Used (for your reference):', supplierPlainPassword);
    console.log('Bcrypt Hash (Copy this into your database):');
    console.log(hash);
    console.log('-----------------------------');
    console.log("Now, go to your database and run an INSERT or UPDATE command.");
    console.log("Example INSERT for a new supplier:");
    console.log(`INSERT INTO suppliers (name, email, password_hash, category, is_active) VALUES ('Test Supplier', 'supplier@test.com', '${hash}', 'Medicine', true);`);
    console.log("\nExample UPDATE if supplier already exists:");
    console.log(`UPDATE suppliers SET password_hash = '${hash}' WHERE email = 'supplier@test.com';`);
});