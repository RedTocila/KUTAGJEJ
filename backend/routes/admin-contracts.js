const express = require('express');
const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Role = require('../models/Role');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function formatContract(doc) {
  const roles = (doc.roleIds || [])
    .map((r) => {
      if (r && typeof r === 'object' && r._id) {
        return { id: String(r._id), name: r.name || '' };
      }
      if (r == null) return null;
      return { id: String(r), name: '' };
    })
    .filter(Boolean);
  return {
    id: String(doc._id),
    title: doc.title,
    content: doc.content || '',
    roles,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function normalizeRoleIds(ids) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of ids) {
    const s = String(raw ?? '').trim();
    if (!s || !mongoose.Types.ObjectId.isValid(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(new mongoose.Types.ObjectId(s));
  }
  return out;
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const docs = await Contract.find().sort({ updatedAt: -1 }).populate('roleIds', 'name').lean();
    res.json({ contracts: docs.map((d) => formatContract(d)) });
  } catch (error) {
    console.error('GET /admin/contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content, roleIds } = req.body;
    const t = String(title || '').trim();
    if (!t) {
      return res.status(400).json({ message: 'Titulli i kontratës është i detyrueshëm.' });
    }

    const roleObjectIds = normalizeRoleIds(roleIds);
    if (roleObjectIds.length === 0) {
      return res.status(400).json({ message: 'Zgjidhni të paktën një rol nga katalogu.' });
    }

    const found = await Role.find({ _id: { $in: roleObjectIds } }).select('_id').lean();
    if (found.length !== roleObjectIds.length) {
      return res.status(400).json({ message: 'Një ose më shumë role nuk ekzistojnë.' });
    }

    const contract = new Contract({
      title: t,
      content: content !== undefined ? String(content) : '',
      roleIds: roleObjectIds,
      createdBy: req.admin._id,
    });
    await contract.save();
    const populated = await Contract.findById(contract._id).populate('roleIds', 'name').lean();
    res.status(201).json({ contract: formatContract(populated) });
  } catch (error) {
    console.error('POST /admin/contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Kontrata nuk u gjet.' });

    const { title, content, roleIds } = req.body;

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ message: 'Titulli nuk mund të jetë bosh.' });
      contract.title = t;
    }
    if (content !== undefined) contract.content = String(content);

    if (roleIds !== undefined) {
      const roleObjectIds = normalizeRoleIds(roleIds);
      if (roleObjectIds.length === 0) {
        return res.status(400).json({ message: 'Zgjidhni të paktën një rol.' });
      }
      const found = await Role.find({ _id: { $in: roleObjectIds } }).select('_id').lean();
      if (found.length !== roleObjectIds.length) {
        return res.status(400).json({ message: 'Një ose më shumë role nuk ekzistojnë.' });
      }
      contract.roleIds = roleObjectIds;
    }

    await contract.save();
    const populated = await Contract.findById(contract._id).populate('roleIds', 'name').lean();
    res.json({ contract: formatContract(populated) });
  } catch (error) {
    console.error('PATCH /admin/contracts/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Kontrata nuk u gjet.' });
    res.json({ message: 'Kontrata u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/contracts/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
