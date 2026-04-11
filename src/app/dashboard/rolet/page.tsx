'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
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

import { paths } from '@/paths';
import type { Role } from '@/types/role';
import { createRole, deleteRole, listRoles, updateRole } from '@/lib/admin-roles-client';
import { useUser } from '@/hooks/use-user';

export default function RolesPage() {
  const router = useRouter();
  const { user } = useUser();

  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRole, setEditRole] = React.useState<Role | null>(null);
  const [deleteRoleState, setDeleteRoleState] = React.useState<Role | null>(null);

  const isPlatformAdmin =
    user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);

  const refresh = React.useCallback(async () => {
    setLoadError(null);
    const { roles: list, error } = await listRoles();
    if (error) {
      setLoadError(error);
      setRoles([]);
    } else {
      setRoles(list ?? []);
    }
    setLoading(false);
  }, []);

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Rolet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Përcaktoni emrat e roleve këtu; pastaj zgjidhni një rol kur krijoni përdorues në faqen Përdoruesit.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Shto rol
        </Button>
      </Box>

      {loadError ? <Alert severity="error">{loadError}</Alert> : null}

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Emri i rolit</TableCell>
              <TableCell>Përshkrimi</TableCell>
              <TableCell align="right">Veprime</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3}>Duke u ngarkuar…</TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>Nuk ka role. Shtoni një rol përpara se të krijoni përdorues.</TableCell>
              </TableRow>
            ) : (
              roles.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.description || '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton aria-label="Ndrysho" size="small" onClick={() => setEditRole(row)}>
                      {React.createElement(PencilSimpleIcon, { size: 20 })}
                    </IconButton>
                    <IconButton aria-label="Fshi" size="small" color="error" onClick={() => setDeleteRoleState(row)}>
                      {React.createElement(TrashIcon, { size: 20 })}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <RoleCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await refresh();
        }}
      />

      <RoleEditDialog
        role={editRole}
        onClose={() => setEditRole(null)}
        onSaved={async () => {
          setEditRole(null);
          await refresh();
        }}
      />

      <RoleDeleteDialog
        role={deleteRoleState}
        onClose={() => setDeleteRoleState(null)}
        onDeleted={async () => {
          setDeleteRoleState(null);
          await refresh();
        }}
      />
    </Stack>
  );
}

function RoleCreateDialog(props: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const { open, onClose, onCreated } = props;
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setError(null);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: err } = await createRole({ name: name.trim(), description: description.trim() });
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>Shto rol</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Emri i rolit" value={name} onChange={(ev) => setName(ev.target.value)} required fullWidth />
            <TextField
              label="Përshkrimi (opsional)"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Anulo</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Duke u ruajtur…' : 'Ruaj'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function RoleEditDialog(props: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { role, onClose, onSaved } = props;
  const open = Boolean(role);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!role) return;
    setName(role.name);
    setDescription(role.description ?? '');
    setError(null);
  }, [role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setPending(true);
    try {
      const { error: err } = await updateRole(role.id, {
        name: name.trim(),
        description: description.trim(),
      });
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>Ndrysho rolin</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Emri i rolit" value={name} onChange={(ev) => setName(ev.target.value)} required fullWidth />
            <TextField
              label="Përshkrimi"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Anulo</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Duke u ruajtur…' : 'Ruaj'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function RoleDeleteDialog(props: {
  role: Role | null;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const { role, onClose, onDeleted } = props;
  const open = Boolean(role);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    if (!role) return;
    setError(null);
    setPending(true);
    try {
      const { error: err } = await deleteRole(role.id);
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Fshi rolin?</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        ) : null}
        <Typography variant="body2">
          Roli <strong>{role?.name}</strong> do të hiqet nga lista. Nuk mund të fshihet nëse ka përdorues që e përdorin.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anulo</Button>
        <Button color="error" variant="contained" onClick={() => void confirm()} disabled={pending}>
          {pending ? 'Duke u fshirë…' : 'Fshi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
