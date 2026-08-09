'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
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
import { formatRatingDisplay } from '@/lib/format-rating';
import { productButtonSx, productFieldSx } from '@/styles/product-sx';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

const surfaceSx = {
  p: 1.5,
  borderRadius: 2,
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
  border: '1px solid',
  borderColor: 'divider',
} as const;

export type ProfessionalReviewStats = {
  ratingAverage: number | null;
  reviewCount: number;
};

export function ProfessionalReviewSection({
  listingId,
  ratingAverage,
  reviewCount,
  onReviewSubmitted,
  onStatsChange,
}: {
  listingId: string;
  ratingAverage: number | null | undefined;
  reviewCount: number | undefined;
  onReviewSubmitted?: () => void;
  /** Fired when the live review list is loaded/updated (keeps header stars in sync). */
  onStatsChange?: (stats: ProfessionalReviewStats) => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [reviews, setReviews] = React.useState<ProfessionalReview[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = React.useState(false);
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
      setReviewsLoaded(true);
    }
  }, [listingId]);

  React.useEffect(() => {
    void load();
  }, [load, user?.id]);

  React.useEffect(() => {
    if (!reviewsLoaded || !onStatsChange) return;
    const nextCount = reviews.length;
    const nextAvg =
      nextCount > 0 ? reviews.reduce((sum, row) => sum + row.rating, 0) / nextCount : null;
    onStatsChange({ ratingAverage: nextAvg, reviewCount: nextCount });
  }, [onStatsChange, reviews, reviewsLoaded]);

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

  const liveAvg =
    reviewsLoaded && reviews.length > 0
      ? reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length
      : null;
  const count = reviewsLoaded ? reviews.length : (reviewCount ?? 0);
  const avg =
    liveAvg != null
      ? formatRatingDisplay(liveAvg)
      : ratingAverage != null
        ? formatRatingDisplay(Number(ratingAverage))
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
        <ProductDialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
          <ProductDialogTitle onClose={() => setOpen(false)}>Vlerësoni profesionistin</ProductDialogTitle>
          <ProductDialogContent>
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
          </ProductDialogContent>
          <ProductDialogActions>
            <Button
              variant="contained"
              disabled={submitting}
              onClick={() => void submit()}
              sx={{ ...productButtonSx, px: 2.5 }}
            >
              Dërgo
            </Button>
          </ProductDialogActions>
        </ProductDialog>
      ) : null}
    </Stack>
  );
}
