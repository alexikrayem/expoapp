// services/passwordPolicy.js
const MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 10);
const REQUIRE_COMPLEXITY = process.env.PASSWORD_REQUIRE_COMPLEXITY !== 'false';

const hasUpper = (value) => /[A-Z]/.test(value);
const hasLower = (value) => /[a-z]/.test(value);
const hasNumber = (value) => /\d/.test(value);
const hasSymbol = (value) => /[^A-Za-z0-9]/.test(value);

const validatePassword = (password) => {
  const errors = [];
  if (!password || typeof password !== 'string') {
    return ['Password is required'];
  }

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  }

  if (REQUIRE_COMPLEXITY) {
    if (!hasUpper(password)) errors.push('Password must include an uppercase letter');
    if (!hasLower(password)) errors.push('Password must include a lowercase letter');
    if (!hasNumber(password)) errors.push('Password must include a number');
    if (!hasSymbol(password)) errors.push('Password must include a symbol');
  }

  return errors;
};

module.exports = {
  validatePassword,
  MIN_LENGTH,
  REQUIRE_COMPLEXITY,
};
