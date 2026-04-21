const express = require('express');
const mongoose = require('mongoose');
const ManagedUser = require('../models/ManagedUser');
const Admin = require('../models/Admin');
const BusinessUser = require('../models/BusinessUser');
const IndividualUser = require('../models/IndividualUser');
const Role = require('../models/Role');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

async function isEmailInUse(email, excludeManagedUserId) {
  const e = String(email).toLowerCase().trim();
  const [fromAdmin, fromBusiness, fromIndividual, fromManaged] = await Promise.all([
    Admin.findOne({ email: e }),
    BusinessUser.findOne({ email: e }),
    IndividualUser.findOne({ email: e }),
    excludeManagedUserId
      ? ManagedUser.findOne({ email: e, _id: { $ne: excludeManagedUserId } })
      : ManagedUser.findOne({ email: e }),
  ]);
  return Boolean(fromAdmin || fromBusiness || fromIndividual || fromManaged);
}

function formatManagedUser(doc) {
  const roleIdObj = doc.roleId && typeof doc.roleId === 'object' ? doc.roleId : null;
  return {
    id: String(doc._id),
    email: doc.email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    roleId: roleIdObj?._id != null ? String(roleIdObj._id) : doc.roleId != null ? String(doc.roleId) : null,
    role: doc.role,
    roleDescription: roleIdObj?.description ?? '',
    isActive: doc.isActive,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastLogin: doc.lastLogin,
  };
}

function formatDirectoryIndividual(doc) {
  return {
    ...formatManagedUser({
      ...doc,
      roleId: null,
      role: 'individual-user',
      createdBy: null,
    }),
    roleDescription: '',
    accountKind: 'individual',
    roleLabel: 'Individ',
    staffRoleName: null,
    manageable: false,
    businessName: null,
    nipt: null,
  };
}

function formatDirectoryBusiness(doc) {
  return {
    ...formatManagedUser({
      ...doc,
      roleId: null,
      role: 'business-user',
      lastLogin: undefined,
      createdBy: null,
    }),
    roleDescription: '',
    accountKind: 'business',
    roleLabel: 'Biznes',
    staffRoleName: null,
    manageable: false,
    businessName: doc.businessName ?? null,
    nipt: doc.nipt ?? null,
  };
}

function formatDirectoryStaff(doc) {
  const base = formatManagedUser(doc);
  return {
    ...base,
    accountKind: 'support',
    roleLabel: 'Mbështetje',
    staffRoleName: base.role,
    manageable: true,
    businessName: null,
    nipt: null,
  };
}

function sortKey(u) {
  const t = u.updatedAt || u.createdAt;
  return t ? new Date(t).getTime() : 0;
}

router.use(authMiddleware, requirePlatformAdmin);

/** List all platform users: individuals, businesses, and staff (support), newest first. */
router.get('/', async (_req, res) => {
  try {
    const [individuals, businesses, staff] = await Promise.all([
      IndividualUser.find().sort({ createdAt: -1 }).select('-password').lean(),
      BusinessUser.find().sort({ createdAt: -1 }).select('-password').lean(),
      ManagedUser.find().sort({ createdAt: -1 }).select('-password').populate('roleId', 'name description').lean(),
    ]);
    const rows = [
      ...individuals.map((u) => formatDirectoryIndividual(u)),
      ...businesses.map((u) => formatDirectoryBusiness(u)),
      ...staff.map((u) => formatDirectoryStaff(u)),
    ].sort((a, b) => sortKey(b) - sortKey(a));
    res.json({ users: rows });
  } catch (error) {
    console.error('GET /admin/users:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Create a managed user; `roleId` must reference an existing Role. */
router.post('/', async (req, res) => {
  try {
    const { email, password, roleId, firstName, lastName } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: 'Emaili është i detyrueshëm.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
    }
    if (!roleId || !mongoose.Types.ObjectId.isValid(String(roleId))) {
      return res.status(400).json({ message: 'Roli (roleId) është i detyrueshëm.' });
    }

    const roleDoc = await Role.findById(roleId);
    if (!roleDoc) {
      return res.status(400).json({ message: 'Roli i zgjedhur nuk ekziston.' });
    }

    if (await isEmailInUse(email, null)) {
      return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
    }

    const user = new ManagedUser({
      email: String(email).toLowerCase().trim(),
      password: String(password),
      roleId: roleDoc._id,
      role: roleDoc.name,
      firstName: firstName !== undefined ? String(firstName).trim() : undefined,
      lastName: lastName !== undefined ? String(lastName).trim() : undefined,
      createdBy: req.admin._id,
    });
    await user.save();
    const populated = await ManagedUser.findById(user._id).select('-password').populate('roleId', 'name description').lean();
    res.status(201).json({ user: formatManagedUser(populated) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
    }
    console.error('POST /admin/users:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Get one managed user. */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const user = await ManagedUser.findById(req.params.id).select('-password').populate('roleId', 'name description').lean();
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    res.json({ user: formatManagedUser(user) });
  } catch (error) {
    console.error('GET /admin/users/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Update managed user (role via roleId, profile, active flag, email, optional new password). */
router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const user = await ManagedUser.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const { email, password, roleId, firstName, lastName, isActive } = req.body;

    if (email !== undefined) {
      const nextEmail = String(email).toLowerCase().trim();
      if (!nextEmail) return res.status(400).json({ message: 'Emaili nuk mund të jetë bosh.' });
      if (nextEmail !== user.email && (await isEmailInUse(nextEmail, user._id))) {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      user.email = nextEmail;
    }
    if (password !== undefined) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
      }
      user.password = String(password);
    }
    if (roleId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(String(roleId))) {
        return res.status(400).json({ message: 'ID e rolit është e pavlefshme.' });
      }
      const roleDoc = await Role.findById(roleId);
      if (!roleDoc) {
        return res.status(400).json({ message: 'Roli i zgjedhur nuk ekziston.' });
      }
      user.roleId = roleDoc._id;
      user.role = roleDoc.name;
    }
    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    await user.save();
    const populated = await ManagedUser.findById(user._id).select('-password').populate('roleId', 'name description').lean();
    res.json({ user: formatManagedUser(populated) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
    }
    console.error('PATCH /admin/users/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Delete a managed user permanently. */
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const user = await ManagedUser.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    res.json({ message: 'Përdoruesi u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/users/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
