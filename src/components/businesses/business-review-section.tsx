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
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

import { listBusinessReviews, submitBusinessReview, type BusinessReview } from '@/lib/business-reviews-client';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

export function BusinessReviewSection({
  listingId,
  ratingAverage,
  reviewCount,
  onReviewSubmitted,
}: {
  listingId: string;
  ratingAverage: number | null | undefined;
  reviewCount: number | undefined;
  onReviewSubmitted?: () => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [reviews, setReviews] = React.useState<BusinessReview[]>([]);
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number | null>(5);
  const [comment, setComment] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await listBusinessReviews(listingId);
    if (!res.error) setReviews(res.reviews ?? []);
  }, [listingId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    if (!user) {
      router.push(`${paths.user.auth}?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : paths.public.businesses)}`);
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!rating) {
      setError('Zgjidhni vlerësimin.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await submitBusinessReview(listingId, rating, comment);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    await load();
    onReviewSubmitted?.();
  };

  const count = reviewCount ?? 0;
  const avg = ratingAverage != null ? Number(ratingAverage).toFixed(1) : null;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
        {avg ? (
          <>
            <StarIcon size={18} weight="fill" color="var(--mui-palette-primary-main)" />
            <Typography sx={{ fontWeight: 700 }}>{avg}</Typography>
          </>
        ) : null}
        <Typography variant="body2" color="text.secondary">
          ({count} vlerësime)
        </Typography>
        <Button size="small" variant="outlined" onClick={openDialog} sx={{ ml: 'auto' }}>
          Lini vlerësim
        </Button>
      </Stack>

      {reviews.length > 0 ? (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {reviews.slice(0, 5).map((r) => (
            <Box key={r.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Rating value={r.rating} readOnly size="small" />
                <Typography variant="caption" color="text.secondary">
                  {r.reviewerName} · {new Date(r.createdAt).toLocaleDateString('sq-AL')}
                </Typography>
              </Stack>
              {r.comment ? (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {r.comment}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Ende pa vlerësime. Bëhuni i pari që lini një koment.
        </Typography>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Vlerësoni biznesin</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Rating value={rating} onChange={(_, v) => setRating(v)} />
            <TextField
              label="Komenti (opsionale)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">
            Anulo
          </Button>
          <Button variant="contained" disabled={submitting} onClick={() => void submit()}>
            Dërgo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
