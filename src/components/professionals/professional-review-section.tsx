'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
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
import { alpha } from '@mui/material/styles';

import {
  ProfessionalFiveStarRating,
  ProfessionalReviewsSectionHeader,
} from '@/components/public/professional-listing-detail-ui';
import {
  listProfessionalReviews,
  submitProfessionalReview,
  type ProfessionalReview,
} from '@/lib/professional-reviews-client';
import { mapApiReviewToView } from '@/lib/professional-listing-detail-content';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

const surfaceSx = {
  p: 1.5,
  borderRadius: 2,
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
  border: '1px solid',
  borderColor: 'divider',
} as const;

export function ProfessionalReviewSection({
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
  const [reviews, setReviews] = React.useState<ProfessionalReview[]>([]);
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number | null>(5);
  const [comment, setComment] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await listProfessionalReviews(listingId);
    if (!res.error) setReviews(res.reviews ?? []);
  }, [listingId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    if (!user) {
      router.push(
        `${paths.user.auth}?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : paths.public.professionals)}`,
      );
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
    const res = await submitProfessionalReview(listingId, rating, comment);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    await load();
    onReviewSubmitted?.();
  };

  const count = reviewCount ?? reviews.length;
  const avg =
    ratingAverage != null
      ? Number(ratingAverage).toFixed(1)
      : reviews.length > 0
        ? (
            reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
          ).toFixed(1)
        : null;

  const views = reviews.map(mapApiReviewToView);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        {avg ? (
          <ProfessionalReviewsSectionHeader rating={avg} reviewCount={count} />
        ) : (
          <Typography sx={{ fontWeight: 800, fontSize: '0.875rem' }}>Vlerësimet</Typography>
        )}
        <Button size="small" variant="outlined" onClick={openDialog}>
          Lini vlerësim
        </Button>
      </Stack>

      {views.length > 0 ? (
        <Stack spacing={1.25}>
          {views.map((review) => (
            <Box key={review.id} sx={surfaceSx}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                    color: 'primary.main',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                  }}
                >
                  {review.initials}
                </Avatar>
                <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.75rem' }}>{review.author}</Typography>
                    <Typography sx={{ fontSize: '0.625rem', color: 'text.disabled', flexShrink: 0 }}>
                      {review.dateLabel}
                    </Typography>
                  </Stack>
                  <ProfessionalFiveStarRating value={review.rating} size={14} />
                  {review.text ? (
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.45 }}>
                      {review.text}
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Ende pa vlerësime.
        </Typography>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Vlerësoni profesionistin</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Rating value={rating} onChange={(_, v) => setRating(v)} />
            <TextField
              label="Komenti"
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
    </Stack>
  );
}
