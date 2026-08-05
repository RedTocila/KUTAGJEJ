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
  IconButton,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

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
import { productButtonSx, productDialogSlotProps, productFieldSx } from '@/styles/product-sx';
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
  const [viewerHasReviewed, setViewerHasReviewed] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState<number | null>(5);
  const [comment, setComment] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await listProfessionalReviews(listingId);
    if (!res.error) {
      setReviews(res.reviews ?? []);
      setViewerHasReviewed(Boolean(res.viewerHasReviewed));
    }
  }, [listingId]);

  React.useEffect(() => {
    void load();
  }, [load, user?.id]);

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
    setViewerHasReviewed(true);
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
  const showLeaveReview = !viewerHasReviewed;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        {avg ? (
          <ProfessionalReviewsSectionHeader rating={avg} reviewCount={count} />
        ) : (
          <Typography sx={{ fontWeight: 800, fontSize: '0.875rem' }}>Vlerësimet</Typography>
        )}
        {showLeaveReview ? (
          <Button size="small" variant="outlined" onClick={openDialog}>
            Lini vlerësim
          </Button>
        ) : null}
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

      {showLeaveReview ? (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="xs"
          fullWidth
          slotProps={productDialogSlotProps}
        >
          <DialogTitle
            sx={{
              position: 'relative',
              px: 2.5,
              pt: 2.5,
              pb: 1,
              pr: 6,
              fontWeight: 800,
              fontSize: '1.125rem',
              letterSpacing: '-0.01em',
            }}
          >
            Vlerësoni profesionistin
            <IconButton
              aria-label="Mbyll"
              onClick={() => setOpen(false)}
              size="small"
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                color: 'text.secondary',
                borderRadius: 2,
                '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
              }}
            >
              <XIcon size={18} weight="bold" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 2.5, pb: 1.5, pt: '8px !important' }}>
            <Stack spacing={2.25}>
              {error ? (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              ) : null}
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.25, fontWeight: 600, fontSize: '0.8125rem' }}
                >
                  Sa yje i jepni?
                </Typography>
                <Rating
                  value={rating}
                  onChange={(_, v) => setRating(v)}
                  size="large"
                  sx={{
                    fontSize: '2.75rem',
                    gap: 0.5,
                    '& .MuiRating-iconFilled': { color: 'warning.main' },
                    '& .MuiRating-iconHover': { color: 'warning.main' },
                  }}
                />
              </Box>
              <TextField
                label="Komenti (opsional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                sx={productFieldSx}
              />
            </Stack>
          </DialogContent>
          <DialogActions
            sx={{
              px: 2.5,
              pb: 2.5,
              pt: 1,
            }}
          >
            <Button
              variant="contained"
              disabled={submitting}
              onClick={() => void submit()}
              sx={{ ...productButtonSx, px: 2.5 }}
            >
              Dërgo
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
}
