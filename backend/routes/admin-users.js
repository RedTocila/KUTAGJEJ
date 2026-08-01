const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { mapProfile, getProfileByEmail, createProfileForAuthUser } = require('../lib/profiles');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

async function isEmailInUse(email, excludeUserId) {
  const existing = await getProfileByEmail(email);
  if (!existing) return false;
  if (excludeUserId && String(existing.id) === String(excludeUserId)) return false;
  return true;
}

function formatManagedUser(user, roleDescription) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleId: user.roleId || null,
    role: user.role,
    roleDescription: roleDescription ?? '',
    isActive: user.isActive,
    createdBy: user.createdBy,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
  };
}

function formatDirectoryIndividual(user) {
  return {
    ...formatManagedUser({ ...user, roleId: null, role: 'individual-user', createdBy: null }, ''),
    accountKind: 'individual',
    roleLabel: 'Individ',
    staffRoleName: null,
    manageable: false,
    businessName: null,
    nipt: null,
  };
}

function formatDirectoryBusiness(user) {
  return {
    ...formatManagedUser({ ...user, roleId: null, role: 'business-user', lastLogin: undefined, createdBy: null }, ''),
    accountKind: 'business',
    roleLabel: 'Biznes',
    staffRoleName: null,
    manageable: false,
    businessName: user.businessName ?? null,
    nipt: user.nipt ?? null,
  };
}

function formatDirectoryStaff(user, roleDescription) {
  const base = formatManagedUser(user, roleDescription);
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
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .in('account_type', ['individual', 'business', 'managed']);
    if (error) throw error;

    const rows = (data || []).map(mapProfile);
    const roleIds = [...new Set(rows.filter((u) => u.accountType === 'managed' && u.roleId).map((u) => u.roleId))];
    let roleById = new Map();
    if (roleIds.length) {
      const { data: roles, error: rolesError } = await sb.from('roles').select('id, description').in('id', roleIds);
      if (rolesError) throw rolesError;
      roleById = new Map((roles || []).map((r) => [r.id, r.description || '']));
    }

    const users = rows
      .map((u) => {
        if (u.accountType === 'individual') return formatDirectoryIndividual(u);
        if (u.accountType === 'business') return formatDirectoryBusiness(u);
        return formatDirectoryStaff(u, roleById.get(u.roleId) ?? '');
      })
      .sort((a, b) => sortKey(b) - sortKey(a));

    res.json({ users });
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
    if (!roleId || !UUID_RE.test(String(roleId))) {
      return res.status(400).json({ message: 'Roli (roleId) është i detyrueshëm.' });
    }

    const sb = getSupabaseAdmin();
    const { data: roleDoc, error: roleError } = await sb.from('roles').select('*').eq('id', roleId).maybeSingle();
    if (roleError) throw roleError;
    if (!roleDoc) {
      return res.status(400).json({ message: 'Roli i zgjedhur nuk ekziston.' });
    }

    const emailNorm = String(email).toLowerCase().trim();
    if (await isEmailInUse(emailNorm, null)) {
      return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
    }

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      if (/already.*registered|already.*exists/i.test(createErr?.message || '')) {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      console.error('POST /admin/users auth.createUser:', createErr?.message);
      return res.status(500).json({ message: 'Gabim serveri.' });
    }

    let user;
    try {
      user = await createProfileForAuthUser(created.user.id, {
        email: emailNorm,
        accountType: 'managed',
        roleId: roleDoc.id,
        role: roleDoc.name,
        firstName: firstName !== undefined ? String(firstName).trim() : '',
        lastName: lastName !== undefined ? String(lastName).trim() : '',
        createdBy: req.admin.id,
      });
    } catch (profileError) {
      await sb.auth.admin.deleteUser(created.user.id).catch(() => {});
      if (profileError?.code === '23505') {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      throw profileError;
    }

    res.status(201).json({ user: formatManagedUser(user, roleDoc.description || '') });
  } catch (error) {
    console.error('POST /admin/users:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Get one managed user. */
router.get('/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: row, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .eq('account_type', 'managed')
      .maybeSingle();
    if (error) throw error;
    if (!row) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const user = mapProfile(row);
    let roleDescription = '';
    if (user.roleId) {
      const { data: roleDoc } = await sb.from('roles').select('description').eq('id', user.roleId).maybeSingle();
      roleDescription = roleDoc?.description ?? '';
    }
    res.json({ user: formatManagedUser(user, roleDescription) });
  } catch (error) {
    console.error('GET /admin/users/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Update managed user (role via roleId, profile, active flag, email, optional new password). */
router.patch('/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: row, error: findError } = await sb
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .eq('account_type', 'managed')
      .maybeSingle();
    if (findError) throw findError;
    if (!row) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const user = mapProfile(row);
    const { email, password, roleId, firstName, lastName, isActive } = req.body;
    let roleDoc = null;

    if (email !== undefined) {
      const nextEmail = String(email).toLowerCase().trim();
      if (!nextEmail) return res.status(400).json({ message: 'Emaili nuk mund të jetë bosh.' });
      if (nextEmail !== user.email && (await isEmailInUse(nextEmail, user.id))) {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      user.email = nextEmail;
    }
    if (password !== undefined) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
      }
    }
    if (roleId !== undefined) {
      if (!UUID_RE.test(String(roleId))) {
        return res.status(400).json({ message: 'ID e rolit është e pavlefshme.' });
      }
      const { data: found, error: roleError } = await sb.from('roles').select('*').eq('id', roleId).maybeSingle();
      if (roleError) throw roleError;
      if (!found) {
        return res.status(400).json({ message: 'Roli i zgjedhur nuk ekziston.' });
      }
      roleDoc = found;
      user.roleId = roleDoc.id;
      user.role = roleDoc.name;
    }
    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    if (email !== undefined || password !== undefined) {
      const authPatch = {};
      if (email !== undefined) authPatch.email = user.email;
      if (password !== undefined) authPatch.password = String(password);
      const { error: authError } = await sb.auth.admin.updateUserById(user.id, authPatch);
      if (authError) {
        if (/already.*registered|already.*exists/i.test(authError.message || '')) {
          return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
        }
        throw authError;
      }
    }

    try {
      await user.save();
    } catch (saveError) {
      if (saveError?.code === '23505') {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      throw saveError;
    }

    let roleDescription = roleDoc?.description ?? '';
    if (user.roleId && !roleDoc) {
      const { data: existingRole } = await sb.from('roles').select('description').eq('id', user.roleId).maybeSingle();
      roleDescription = existingRole?.description ?? '';
    }
    res.json({ user: formatManagedUser(user, roleDescription) });
  } catch (error) {
    console.error('PATCH /admin/users/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Delete a managed user permanently. */
router.delete('/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: row, error: findError } = await sb
      .from('profiles')
      .select('id')
      .eq('id', req.params.id)
      .eq('account_type', 'managed')
      .maybeSingle();
    if (findError) throw findError;
    if (!row) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const { error: deleteError } = await sb.auth.admin.deleteUser(req.params.id);
    if (deleteError) throw deleteError;
    res.json({ message: 'Përdoruesi u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/users/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
