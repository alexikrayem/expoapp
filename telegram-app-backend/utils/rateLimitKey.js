const rateLimit = require('express-rate-limit');

const ipKeyGenerator = rateLimit.ipKeyGenerator || ((ip) => ip);

const getClientKey = (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || '');

module.exports = { getClientKey };
