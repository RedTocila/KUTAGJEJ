const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const BusinessUser = require('../models/BusinessUser');
const ManagedUser = require('../models/ManagedUser');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Auth required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await Admin.findById(decoded.id);
    if (!user) user = await BusinessUser.findById(decoded.id);
    if (!user) user = await ManagedUser.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    if (user.constructor.modelName === 'ManagedUser' && user.roleId) {
      await user.populate('roleId', 'name');
    }

    if (user.constructor.modelName === 'ManagedUser' && user.isActive === false) {
      return res.status(401).json({ message: 'Llogaria është çaktivizuar.' });
    }

    user.lastActive = new Date();
    await user.save();

    req.admin = user;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
