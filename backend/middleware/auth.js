const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const BusinessUser = require('../models/BusinessUser');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Auth required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await Admin.findById(decoded.id) || await BusinessUser.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    user.lastActive = new Date();
    await user.save();

    req.admin = user;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
