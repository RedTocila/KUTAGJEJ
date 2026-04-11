const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const BusinessUser = require('../models/BusinessUser');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/** Dashboard profile & password routes: admin role only (not business users). */
function requireAdminRole(req, res, next) {
  if (!req.admin || req.admin.role !== 'admin') {
    return res.status(403).json({ message: 'Vetëm administratorët mund ta përdorin këtë funksion.' });
  }
  next();
}

const formatUser = (user) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin,
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Emaili dhe fjalëkalimi janë të detyrueshëm.' });
    }

    let user = await Admin.findOne({ email: email.toLowerCase() });
    if (!user) user = await BusinessUser.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    if (user.role === 'admin') {
      user.lastLogin = new Date();
      await user.save();
    }

    const secret = String(process.env.JWT_SECRET || '').trim();
    if (!secret) {
      console.error('Login blocked: JWT_SECRET is not set');
      return res.status(500).json({ message: 'Gabim serveri.' });
    }

    const token = jwt.sign(
      { id: String(user._id), email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' },
    );
    res.json({ token, admin: formatUser(user) });
  } catch (error) {
    console.error('POST /login error:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.get('/admin/me', authMiddleware, async (req, res) => {
  try {
    res.json({ admin: formatUser(req.admin) });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/admin/update-profile', authMiddleware, requireAdminRole, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const admin = req.admin;

    if (email === undefined || !String(email).trim()) {
      return res.status(400).json({ message: 'Emaili është i detyrueshëm.' });
    }

    if (email && String(email).toLowerCase() !== admin.email) {
      const nextEmail = String(email).toLowerCase().trim();
      const existing = await Admin.findOne({ email: nextEmail });
      if (existing && String(existing._id) !== String(admin._id)) {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      admin.email = nextEmail;
    }

    if (firstName !== undefined) admin.firstName = String(firstName).trim();
    if (lastName !== undefined) admin.lastName = String(lastName).trim();
    await admin.save();

    res.json({ message: 'Profili u përditësua.', admin: formatUser(admin) });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/admin/change-password', authMiddleware, requireAdminRole, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Fjalëkalimi aktual dhe i ri janë të detyrueshëm.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.' });
    }
    if (!(await req.admin.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Fjalëkalimi aktual është i pasaktë.' });
    }

    req.admin.password = newPassword;
    await req.admin.save();
    res.json({ message: 'Fjalëkalimi u ndryshua.' });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
