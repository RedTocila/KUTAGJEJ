'use client';

import * as React from 'react';
import {
  Alert,
  alpha,
  Box,
  Card,
  CardContent,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';

import { CategoryEditor } from '@/components/dashboard/categories/category-editor';
import { CategoryPickerGrid } from '@/components/dashboard/categories/category-picker-grid';
import { CATEGORY_HELP, TAB_ORDER } from '@/components/dashboard/categories/category-config';
import type { ListingCategory } from '@/types/listing-category';
import { listCategoriesAdmin } from '@/lib/admin-categories-client';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';

export function CategoriesAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();

  const [categories, setCategories] = React.useState<ListingCategory[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState(0);

  React.useEffect(() => {
    if (!user?.id || !isPlatformAdmin) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      const { categories: list, error } = await listCategoriesAdmin();
      if (cancelled) return;
      if (error) {
        setLoadError(error);
        setCategories([]);
      } else {
        const sorted = (list ?? []).sort(
          (a, b) => TAB_ORDER.indexOf(a.key) - TAB_ORDER.indexOf(b.key),
        );
        setCategories(sorted);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, isPlatformAdmin]);

  const currentKey = TAB_ORDER[tab] ?? TAB_ORDER[0];
  const current = categories.find((c) => c.key === currentKey);

  const onCategorySaved = React.useCallback((next: ListingCategory) => {
    setCategories((prev) => {
      const rest = prev.filter((c) => c.key !== next.key);
      return [...rest, next].sort((a, b) => TAB_ORDER.indexOf(a.key) - TAB_ORDER.indexOf(b.key));
    });
  }, []);

  if (!user || !isPlatformAdmin) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.08)} 0%, ${alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.04 : 0.02)} 100%)`,
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2.5, sm: 3 } }}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: '0.12em', color: 'primary.main', fontWeight: 700 }}
          >
            Konfigurim platforme
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: '-0.02em' }}>
            Kategoritë
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720, lineHeight: 1.65 }}>
            Katër vertikale fikse — secila me slug për URL dhe lloje listimi që përdoruesit zgjedhin kur publikojnë
            (p.sh. Apartament, Vila për prona).
          </Typography>
        </Box>
      </Paper>

      {loadError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      <CategoryPickerGrid
        categories={categories}
        loading={loading}
        selectedTab={tab}
        onSelectTab={setTab}
      />

      {loading ? (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="rounded" height={48} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={120} />
          </CardContent>
        </Card>
      ) : current ? (
        <CategoryEditor
          key={current.key}
          category={current}
          helpText={CATEGORY_HELP[current.key]}
          onSaved={onCategorySaved}
        />
      ) : (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Nuk u gjetën të dhëna për këtë kategori. Rifreskoni faqen.
        </Alert>
      )}
    </Box>
  );
}
