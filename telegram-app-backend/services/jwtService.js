// services/jwtService.js
const jwt = require('jsonwebtoken');

const JWT_ALGORITHMS = process.env.JWT_ALGORITHMS
  ? process.env.JWT_ALGORITHMS.split(',').map((value) => value.trim()).filter(Boolean)
  : ['HS256'];
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;
const JWT_CLOCK_TOLERANCE = Number(process.env.JWT_CLOCK_TOLERANCE || 0);

const buildVerifyOptions = () => {
  const options = { algorithms: JWT_ALGORITHMS };
  if (JWT_ISSUER) options.issuer = JWT_ISSUER;
  if (JWT_AUDIENCE) options.audience = JWT_AUDIENCE;
  if (JWT_CLOCK_TOLERANCE) options.clockTolerance = JWT_CLOCK_TOLERANCE;
  return options;
};

const buildSignOptions = (options = {}) => {
  const merged = { ...options };
  if (JWT_ISSUER) merged.issuer = JWT_ISSUER;
  if (JWT_AUDIENCE) merged.audience = JWT_AUDIENCE;
  return merged;
};

const verifyJwt = (token, secret) => jwt.verify(token, secret, buildVerifyOptions());

const signJwt = (payload, secret, options = {}) =>
  jwt.sign(payload, secret, buildSignOptions(options));

module.exports = {
  JWT_ALGORITHMS,
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_CLOCK_TOLERANCE,
  buildVerifyOptions,
  signJwt,
  verifyJwt,
};
