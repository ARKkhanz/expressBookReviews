const crypto = require('crypto');

module.exports = {
  PORT: Number(process.env.PORT || 8800),
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
};
