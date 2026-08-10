'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Skeleton,
} from '@mui/material';

import { CategoryEditor } from '@/components/dashboard/categories/category-editor';
import { CategoryPickerGrid } from '@/components/dashboard/categories/category-picker-grid';
import { CATEGORY_HELP, TAB_ORDER } from '@/components/dashboard/categories/category-config';
import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import type { ListingCategory } from '@/types/listing-category';
import { listCategoriesAdmin } from '@/lib/admin-categories-client';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { productPanelSx } from '@/styles/product-sx';

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
      <AdminPageHeader
        icon={React.createElement(SquaresFourIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Përmbajtja"
        title="Kategoritë"
        description="Katër vertikale fikse — secila me slug për URL dhe lloje listimi që përdoruesit zgjedhin kur publikojnë."
      />

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
        <Box sx={{ ...productPanelSx, p: 3 }}>
          <Skeleton variant="rounded" height={48} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={120} />
        </Box>
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
