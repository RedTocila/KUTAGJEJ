'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';

import {
  listBusinessReservations,
  listMyBusinessListings,
  patchBusinessReservationStatus,
  type BusinessMineListing,
  type BusinessReservationRow,
} from '@/lib/directory-listings-client';

function statusChip(status: BusinessReservationRow['status']) {
  if (status === 'confirmed') return <Chip size="small" label="Konfirmuar" color="success" />;
  if (status === 'cancelled') return <Chip size="small" label="Anuluar" color="default" />;
  return <Chip size="small" label="Në pritje" color="warning" />;
}

export function BusinessOwnerReservations() {
  const [listings, setListings] = React.useState<BusinessMineListing[]>([]);
  const [listingId, setListingId] = React.useState('');
  const [rows, setRows] = React.useState<BusinessReservationRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await listMyBusinessListings();
      if (res.error) setError(res.error);
      else {
        const list = res.listings ?? [];
        setListings(list);
        if (list[0]) setListingId(list[0].id);
      }
      setLoading(false);
    })();
  }, []);

  const loadReservations = React.useCallback(async () => {
    if (!listingId) return;
    setError(null);
    const res = await listBusinessReservations(listingId, 'all');
    if (res.error) setError(res.error);
    else setRows(res.reservations ?? []);
  }, [listingId]);

  React.useEffect(() => {
    if (listingId) void loadReservations();
  }, [listingId, loadReservations]);

  const setStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    const res = await patchBusinessReservationStatus(id, status);
    if (res.error) setError(res.error);
    else await loadReservations();
  };

  if (loading) return <Typography color="text.secondary">Duke ngarkuar…</Typography>;

  if (listings.length === 0) {
    return (
      <Alert severity="info">
        Nuk keni ende një profil biznesi të publikuar. Postoni një njoftim për të parë rezervimet këtu.
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Rezervimet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Kërkesat ruhen këtu; detajet e plota gjenden edhe në Mesazhe.
            </Typography>
          </Stack>
          <SearchableSelect
            label="Biznesi"
            value={listingId}
            onChange={setListingId}
            options={listings.map((l) => ({ value: l.id, label: l.title }))}
            emptyLabel="Zgjidh biznesin"
            fullWidth={false}
            sx={{ maxWidth: 360 }}
            minOptionsForSearch={4}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          {rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nuk ka rezervime për këtë biznes.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Ora</TableCell>
                    <TableCell>Mysafirë</TableCell>
                    <TableCell>Kontakt</TableCell>
                    <TableCell>Statusi</TableCell>
                    <TableCell align="right">Veprime</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.reservationDate}</TableCell>
                      <TableCell>{r.timeSlot || '—'}</TableCell>
                      <TableCell>{r.partySize}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.guestName}
                        </Typography>
                        <Typography variant="caption">{r.guestPhone}</Typography>
                      </TableCell>
                      <TableCell>{statusChip(r.status)}</TableCell>
                      <TableCell align="right">
                        {r.status === 'pending' ? (
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                            <Button size="small" onClick={() => void setStatus(r.id, 'confirmed')}>
                              Konfirmo
                            </Button>
                            <Button size="small" color="inherit" onClick={() => void setStatus(r.id, 'cancelled')}>
                              Anulo
                            </Button>
                          </Stack>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
