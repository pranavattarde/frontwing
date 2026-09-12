const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not defined!');
  }
  return secret;
}

function generateToken(payload) {
  const secret = getSecret();
  const options = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
  return jwt.sign(payload, secret, options);
}

function verifyToken(token) {
  const secret = getSecret();
  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  verifyToken
};

