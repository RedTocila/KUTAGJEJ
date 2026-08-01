'use strict';

const {
  resolveUserFromAccessToken,
  isUserInactive,
} = require('../lib/resolve-user');

/** Sets req.user when a valid portal token is present; never rejects. */
module.exports = async (req, _res, next) => {
  try {
    const token = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return next();

    const user = await resolveUserFromAccessToken(token);
    if (!user || isUserInactive(user)) return next();

    req.user = user;
    req.accessToken = token;
    next();
  } catch {
    next();
  }
};
