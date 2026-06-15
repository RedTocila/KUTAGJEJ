const jwt = require('jsonwebtoken');
const { resolveUserFromToken, isUserInactive } = require('../lib/resolve-user');

/** Sets req.user when a valid portal token is present; never rejects. */
module.exports = async (req, _res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await resolveUserFromToken(decoded);
    if (!user || isUserInactive(user)) return next();

    req.user = user;
    next();
  } catch {
    next();
  }
};
