const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const BusinessUser = require('../models/BusinessUser');
const IndividualUser = require('../models/IndividualUser');
const ManagedUser = require('../models/ManagedUser');

/** Sets req.user when a valid portal token is present; never rejects. */
module.exports = async (req, _res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await Admin.findById(decoded.id);
    if (!user) user = await BusinessUser.findById(decoded.id);
    if (!user) user = await IndividualUser.findById(decoded.id);
    if (!user) user = await ManagedUser.findById(decoded.id);
    if (!user) return next();

    if (
      (user.constructor.modelName === 'ManagedUser' || user.constructor.modelName === 'IndividualUser') &&
      user.isActive === false
    ) {
      return next();
    }

    req.user = user;
    next();
  } catch {
    next();
  }
};
