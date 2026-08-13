'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { SearchableSelect } from '@/components/core/searchable-select';
import { paths } from '@/paths';
import type { DirectoryUser } from '@/types/directory-user';
import type { ManagedUser } from '@/types/managed-user';
import type { Role } from '@/types/role';
import { listRoles } from '@/lib/admin-roles-client';
import {
  createManagedUser,
  deleteManagedUser,
  listManagedUsers,
  updateManagedUser,
  updatePortalUserIdentity,
} from '@/lib/admin-users-client';
import { useUser } from '@/hooks/use-user';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

function directoryRowToManagedUser(row: DirectoryUser): ManagedUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    roleId: row.roleId,
    role: row.role,
    roleDescription: row.roleDescription,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLogin: row.lastLogin,
  };
}

export default function StaffUsersPage() {
  const router = useRouter();
  const { user } = useUser();

  const [users, setUsers] = React.useState<DirectoryUser[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<ManagedUser | null>(null);
  const [editPortalUser, setEditPortalUser] = React.useState<DirectoryUser | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<ManagedUser | null>(null);

  const refresh = React.useCallback(async () => {
    setLoadError(null);
    const [u, r] = await Promise.all([listManagedUsers(), listRoles()]);
    if (u.error) {
      setLoadError(u.error);
      setUsers([]);
    } else {
      setUsers(u.users ?? []);
    }
    if (!r.error) {
      setRoles(r.roles ?? []);
    }
    setLoading(false);
  }, []);

  const isPlatformAdmin =
    user?.accountType === 'admin' ||
    Boolean(user?.role === 'admin' && user?.accountType === undefined);

  React.useEffect(() => {
    if (!user) return;
    if (!isPlatformAdmin) {
      router.replace(paths.dashboard.overview);
      return;
    }
    void refresh();
  }, [user, router, refresh, isPlatformAdmin]);

  if (!user) return null;

  if (!isPlatformAdmin) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(UsersIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Ekipi"
        title="Përdoruesit"
        description="Lista e portalit dhe stafit. Ndryshoni stafin ose NIPT/ID të përdoruesve të portalit."
        actions={
          <Button variant="contained" onClick={() => setCreateOpen(true)} disabled={roles.length === 0} sx={productButtonSx}>
            Shto përdorues
          </Button>
        }
      />

      {roles.length === 0 && !loading ? (
        <Alert severity="info">
          Nuk ka ende role.{' '}
          <Button component={RouterLink} href={paths.dashboard.roles} size="small" variant="contained" sx={{ ml: 1, ...productButtonSx }}>
            Shko te Rolet
          </Button>{' '}
          për të shtuar të paktën një rol para se të krijoni përdorues.
        </Alert>
      ) : null}

      {loadError ? (
        <Alert severity="error">{loadError}</Alert>
      ) : null}

      <Box sx={{ ...productPanelSx, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Lloji</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Roli (staf)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Emri</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statusi</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Veprime
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Duke u ngarkuar…</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>Nuk ka përdorues të regjistruar.</TableCell>
              </TableRow>
            ) : (
              users.map((row) => (
                <TableRow key={`${row.accountKind}-${row.id}`} hover>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.roleLabel}
                      color={
                        row.accountKind === 'support' ? 'primary' : row.accountKind === 'business' ? 'secondary' : 'info'
                      }
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.accountKind === 'support' && row.staffRoleName ? (
                      <Typography variant="body2">{row.staffRoleName}</Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography variant="body2">
                        {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                      </Typography>
                      {row.accountKind === 'business' && row.businessName ? (
                        <Typography variant="caption" color="text.secondary">
                          {row.businessName}
                          {row.nipt ? ` · NIPT ${row.nipt}` : ''}
                          {row.idNumber ? ` · ID ${row.idNumber}` : ''}
                        </Typography>
                      ) : row.idNumber ? (
                        <Typography variant="caption" color="text.secondary">
                          ID {row.idNumber}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.isActive ? 'Aktiv' : 'Jo aktiv'}
                      color={row.isActive ? 'success' : 'default'}
                      variant={row.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {row.manageable ? (
                      <>
                        <IconButton
                          aria-label="Ndrysho"
                          size="small"
                          onClick={() => setEditUser(directoryRowToManagedUser(row))}
                        >
                          {React.createElement(PencilSimpleIcon, { size: 20 })}
                        </IconButton>
                        <IconButton
                          aria-label="Fshi"
                          size="small"
                          color="error"
                          onClick={() => setDeleteUser(directoryRowToManagedUser(row))}
                        >
                          {React.createElement(TrashIcon, { size: 20 })}
                        </IconButton>
                      </>
                    ) : row.accountKind === 'individual' || row.accountKind === 'business' ? (
                      <IconButton
                        aria-label="Ndrysho NIPT ose ID"
                        size="small"
                        onClick={() => setEditPortalUser(row)}
                      >
                        {React.createElement(PencilSimpleIcon, { size: 20 })}
                      </IconButton>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <CreateUserDialog
        open={createOpen}
        roles={roles}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await refresh();
        }}
      />

      <EditUserDialog
        user={editUser}
        roles={roles}
        onClose={() => setEditUser(null)}
        onSaved={async () => {
          setEditUser(null);
          await refresh();
        }}
      />

      <EditPortalIdentityDialog
        user={editPortalUser}
        onClose={() => setEditPortalUser(null)}
        onSaved={async () => {
          setEditPortalUser(null);
          await refresh();
        }}
      />

      <DeleteUserDialog
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={async () => {
          setDeleteUser(null);
          await refresh();
        }}
      />
    </Stack>
  );
}

function CreateUserDialog(props: {
  open: boolean;
  roles: Role[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const { open, roles, onClose, onCreated } = props;
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [roleId, setRoleId] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEmail('');
    setPassword('');
    setRoleId(roles[0]?.id ?? '');
    setFirstName('');
    setLastName('');
    setError(null);
  }, [open, roles]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!roleId) {
      setError('Zgjidhni një rol.');
      return;
    }
    setPending(true);
    try {
      const { error: err } = await createManagedUser({
        email: email.trim().toLowerCase(),
        password,
        roleId,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      if (err) {
        setError(err);
        return;
      }
      await onCreated();
    } finally {
      setPending(false);
    }
  };

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <ProductDialogTitle onClose={onClose}>Shto përdorues</ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={2} sx={{ mt: 1, ...productFieldSx }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {roles.length === 0 ? (
              <Alert severity="warning">
                Nuk ka role. Shtoni rolet në menunë{' '}
                <Button component={RouterLink} href={paths.dashboard.roles} size="small" variant="outlined" sx={productButtonSx}>
                  Rolet
                </Button>
                .
              </Alert>
            ) : null}
            <TextField label="Email" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required fullWidth autoComplete="off" />
            <TextField
              label="Fjalëkalimi fillestar"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              fullWidth
              autoComplete="new-password"
              helperText="Të paktën 6 karaktere"
            />
            <SearchableSelect
              label="Roli"
              value={roleId}
              onChange={setRoleId}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              emptyLabel="Zgjidhni një rol…"
              required
              disabled={roles.length === 0}
            />
            <TextField label="Emri" value={firstName} onChange={(ev) => setFirstName(ev.target.value)} fullWidth />
            <TextField label="Mbiemri" value={lastName} onChange={(ev) => setLastName(ev.target.value)} fullWidth />
          </Stack>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={onClose} sx={productButtonSx}>Anulo</Button>
          <Button type="submit" variant="contained" disabled={pending || roles.length === 0} sx={productButtonSx}>
            {pending ? 'Duke u ruajtur…' : 'Ruaj'}
          </Button>
        </ProductDialogActions>
      </Box>
    </ProductDialog>
  );
}

function EditUserDialog(props: {
  user: ManagedUser | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { user, roles, onClose, onSaved } = props;
  const open = Boolean(user);
  const [email, setEmail] = React.useState('');
  const [roleId, setRoleId] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setRoleId(user.roleId ? String(user.roleId) : roles[0]?.id ?? '');
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setPassword('');
    setIsActive(user.isActive);
    setError(null);
  }, [user, roles]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!roleId) {
      setError('Zgjidhni një rol.');
      return;
    }
    setPending(true);
    try {
      const body: {
        email: string;
        roleId: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        password?: string;
      } = {
        email: email.trim().toLowerCase(),
        roleId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isActive,
      };
      if (password.trim().length > 0) {
        body.password = password;
      }
      const { error: err } = await updateManagedUser(user.id, body);
      if (err) {
        setError(err);
        return;
      }
      await onSaved();
    } finally {
      setPending(false);
    }
  };

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <ProductDialogTitle onClose={onClose}>Ndrysho përdoruesin</ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={2} sx={{ mt: 1, ...productFieldSx }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Email" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required fullWidth />
            <SearchableSelect
              label="Roli"
              value={roleId}
              onChange={setRoleId}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              emptyLabel="Zgjidhni një rol…"
              required
              disabled={roles.length === 0}
            />
            <TextField label="Emri" value={firstName} onChange={(ev) => setFirstName(ev.target.value)} fullWidth />
            <TextField label="Mbiemri" value={lastName} onChange={(ev) => setLastName(ev.target.value)} fullWidth />
            <TextField
              label="Fjalëkalim i ri (opsional)"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              fullWidth
              autoComplete="new-password"
              helperText="Lëreni bosh për të mos ndryshuar fjalëkalimin"
            />
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(ev) => setIsActive(ev.target.checked)} />}
              label="Llogaria aktive"
            />
          </Stack>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={onClose} sx={productButtonSx}>Anulo</Button>
          <Button type="submit" variant="contained" disabled={pending || roles.length === 0} sx={productButtonSx}>
            {pending ? 'Duke u ruajtur…' : 'Ruaj'}
          </Button>
        </ProductDialogActions>
      </Box>
    </ProductDialog>
  );
}

function EditPortalIdentityDialog(props: {
  user: DirectoryUser | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { user, onClose, onSaved } = props;
  const open = Boolean(user);
  const isBusiness = user?.accountKind === 'business';
  const [nipt, setNipt] = React.useState('');
  const [idNumber, setIdNumber] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setNipt(user.nipt ?? '');
    setIdNumber(user.idNumber ?? '');
    setError(null);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const body: { nipt?: string; idNumber?: string } = {};
    if (isBusiness) {
      const trimmedNipt = nipt.trim();
      if (!trimmedNipt) {
        setError('NIPT nuk mund të jetë bosh.');
        return;
      }
      if (trimmedNipt !== (user.nipt ?? '').trim()) body.nipt = trimmedNipt;
    }
    const trimmedId = idNumber.trim();
    if (trimmedId && trimmedId !== (user.idNumber ?? '').trim()) body.idNumber = trimmedId;

    if (!body.nipt && !body.idNumber) {
      setError('Nuk ka ndryshime për të ruajtur.');
      return;
    }

    setPending(true);
    try {
      const res = await updatePortalUserIdentity(user.id, body);
      if (res.error) {
        setError(res.error);
        return;
      }
      await onSaved();
    } finally {
      setPending(false);
    }
  };

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <ProductDialogTitle onClose={onClose}>Ndrysho NIPT / ID</ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={2} sx={{ mt: 1, ...productFieldSx }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Email" value={user?.email ?? ''} fullWidth disabled />
            {isBusiness ? (
              <TextField
                label="NIPT"
                value={nipt}
                onChange={(ev) => setNipt(ev.target.value)}
                required
                fullWidth
                slotProps={{ htmlInput: { maxLength: 40 } }}
              />
            ) : null}
            <TextField
              label="Numri i ID-së"
              value={idNumber}
              onChange={(ev) => setIdNumber(ev.target.value)}
              fullWidth
              disabled={!user?.idNumber}
              helperText={
                user?.idNumber
                  ? 'Ndryshon ID-në në kërkesën e fundit të verifikimit.'
                  : 'Përdoruesi nuk ka ende kërkesë verifikimi — ID nuk mund të ndryshohet këtu.'
              }
              slotProps={{ htmlInput: { maxLength: 40 } }}
            />
          </Stack>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={onClose} sx={productButtonSx}>Anulo</Button>
          <Button type="submit" variant="contained" disabled={pending} sx={productButtonSx}>
            {pending ? 'Duke u ruajtur…' : 'Ruaj'}
          </Button>
        </ProductDialogActions>
      </Box>
    </ProductDialog>
  );
}

function DeleteUserDialog(props: {
  user: ManagedUser | null;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const { user, onClose, onDeleted } = props;
  const open = Boolean(user);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    if (!user) return;
    setError(null);
    setPending(true);
    try {
      const { error: err } = await deleteManagedUser(user.id);
      if (err) {
        setError(err);
        return;
      }
      await onDeleted();
    } finally {
      setPending(false);
    }
  };

  return (
    <ProductDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <ProductDialogTitle onClose={onClose}>Fshi përdoruesin?</ProductDialogTitle>
      <ProductDialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        ) : null}
        <Typography variant="body2">
          Ky veprim është i përhershëm për <strong>{user?.email}</strong>.
        </Typography>
      </ProductDialogContent>
      <ProductDialogActions>
        <Button onClick={onClose} sx={productButtonSx}>Anulo</Button>
        <Button color="error" variant="contained" onClick={() => void confirm()} disabled={pending} sx={productButtonSx}>
          {pending ? 'Duke u fshirë…' : 'Fshi'}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}
