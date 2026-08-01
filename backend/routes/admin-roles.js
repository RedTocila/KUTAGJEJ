const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { CORE_ROLE_NAMES, sortRolesForAdmin } = require('../lib/core-roles');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function isUniqueViolation(error) {
  return error?.code === '23505';
}

function formatRole(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    isCore: CORE_ROLE_NAMES.has(row.name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin().from('roles').select('*');
    if (error) throw error;
    const sorted = sortRolesForAdmin(data || []);
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

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('roles')
      .insert({
        name: n,
        description: description !== undefined ? String(description).trim() : '',
        created_by: req.admin.id,
      })
      .select('*')
      .single();
    if (error) {
      if (isUniqueViolation(error)) {
        return res.status(400).json({ message: 'Ekziston tashmë një rol me këtë emër.' });
      }
      throw error;
    }
    res.status(201).json({ role: formatRole(data) });
  } catch (error) {
    console.error('POST /admin/roles:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: role, error: findError } = await sb.from('roles').select('*').eq('id', req.params.id).maybeSingle();
    if (findError) throw findError;
    if (!role) return res.status(404).json({ message: 'Roli nuk u gjet.' });

    const { name, description } = req.body;
    const prevName = role.name;
    const patch = {};

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
        patch.name = n;
      }
    }
    if (description !== undefined) patch.description = String(description).trim();
    patch.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await sb
      .from('roles')
      .update(patch)
      .eq('id', role.id)
      .select('*')
      .single();
    if (updateError) {
      if (isUniqueViolation(updateError)) {
        return res.status(400).json({ message: 'Ekziston tashmë një rol me këtë emër.' });
      }
      throw updateError;
    }

    if (name !== undefined && updated.name !== prevName) {
      const { error: cascadeError } = await sb
        .from('profiles')
        .update({ role: updated.name, updated_at: new Date().toISOString() })
        .eq('role_id', role.id);
      if (cascadeError) throw cascadeError;
    }

    res.json({ role: formatRole(updated) });
  } catch (error) {
    console.error('PATCH /admin/roles/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: role, error: findError } = await sb.from('roles').select('*').eq('id', req.params.id).maybeSingle();
    if (findError) throw findError;
    if (!role) return res.status(404).json({ message: 'Roli nuk u gjet.' });
    if (CORE_ROLE_NAMES.has(role.name)) {
      return res.status(400).json({
        message: 'Rolet kryesore të platformës (Individual, Biznes) nuk mund të fshihen.',
      });
    }

    const { count, error: countError } = await sb
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', req.params.id);
    if (countError) throw countError;
    if ((count || 0) > 0) {
      return res.status(400).json({
        message: `Nuk mund të fshihet: ${count} përdorues(e) përdorin ende këtë rol.`,
      });
    }

    const { error: deleteError } = await sb.from('roles').delete().eq('id', req.params.id);
    if (deleteError) throw deleteError;
    res.json({ message: 'Roli u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/roles/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
