const jwt = require('jsonwebtoken');
const { resolveUserFromToken, isUserInactive, touchLastActive } = require('../lib/resolve-user');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Auth required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await resolveUserFromToken(decoded);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    if (user.constructor.modelName === 'ManagedUser' && user.roleId) {
      await user.populate('roleId', 'name');
    }

    if (isUserInactive(user)) {
      return res.status(401).json({ message: 'Llogaria është çaktivizuar.' });
    }

    await touchLastActive(user);

    req.admin = user;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
