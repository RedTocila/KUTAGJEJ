'use strict';

const {
  resolveUserFromAccessToken,
  isUserInactive,
  touchLastActive,
} = require('../lib/resolve-user');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Auth required' });

    const user = await resolveUserFromAccessToken(token);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    if (isUserInactive(user)) {
      return res.status(401).json({ message: 'Llogaria është çaktivizuar.' });
    }

    await touchLastActive(user);

    req.admin = user;
    req.user = user;
    req.accessToken = token;
    next();
  } catch (error) {
    console.error('auth middleware:', error?.message || error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
