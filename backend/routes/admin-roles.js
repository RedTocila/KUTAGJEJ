const express = require('express');
const mongoose = require('mongoose');
const Role = require('../models/Role');
const ManagedUser = require('../models/ManagedUser');
const authMiddleware = require('../middleware/auth');
const { CORE_ROLE_NAMES, sortRolesForAdmin } = require('../lib/core-roles');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function formatRole(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description || '',
    isCore: CORE_ROLE_NAMES.has(doc.name),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const roles = await Role.find().lean();
    const sorted = sortRolesForAdmin(roles);
    res.json({ roles: sorted.map((r) => formatRole(r)) });
  } catch (error) {
    console.error('GET /admin/roles:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const n = String(name || '').trim();
    if (!n) {
      return res.status(400).json({ message: 'Emri i rolit është i detyrueshëm.' });
    }
    if (CORE_ROLE_NAMES.has(n)) {
      return res.status(400).json({
        message: 'Rolet «Individual» dhe «Biznes» janë të rezervuara për platformën dhe krijohen automatikisht.',
      });
    }

    const role = new Role({
      name: n,
      description: description !== undefined ? String(description).trim() : '',
      createdBy: req.admin._id,
    });
    await role.save();
    res.status(201).json({ role: formatRole(role.toObject()) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ekziston tashmë një rol me këtë emër.' });
    }
    console.error('POST /admin/roles:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Roli nuk u gjet.' });

    const { name, description } = req.body;
    const prevName = role.name;

    if (name !== undefined) {
      const n = String(name).trim();
      if (!n) return res.status(400).json({ message: 'Emri i rolit nuk mund të jetë bosh.' });
      if (CORE_ROLE_NAMES.has(role.name)) {
        if (n !== role.name) {
          return res.status(400).json({
            message: 'Emri i roleve kryesore të platformës (Individual, Biznes) nuk mund të ndryshohet.',
          });
        }
      } else {
        if (CORE_ROLE_NAMES.has(n)) {
          return res.status(400).json({ message: 'Ky emër është i rezervuar për rolet kryesore të platformës.' });
        }
        role.name = n;
      }
    }
    if (description !== undefined) role.description = String(description).trim();

    await role.save();

    if (name !== undefined && role.name !== prevName) {
      await ManagedUser.updateMany({ roleId: role._id }, { $set: { role: role.name } });
    }

    res.json({ role: formatRole(role.toObject()) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ekziston tashmë një rol me këtë emër.' });
    }
    console.error('PATCH /admin/roles/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Roli nuk u gjet.' });
    if (CORE_ROLE_NAMES.has(role.name)) {
      return res.status(400).json({
        message: 'Rolet kryesore të platformës (Individual, Biznes) nuk mund të fshihen.',
      });
    }

    const inUse = await ManagedUser.countDocuments({ roleId: req.params.id });
    if (inUse > 0) {
      return res.status(400).json({
        message: `Nuk mund të fshihet: ${inUse} përdorues(e) përdorin ende këtë rol.`,
      });
    }
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Roli u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/roles/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
