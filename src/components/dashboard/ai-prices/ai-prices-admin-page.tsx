'use client';

import * as React from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import { fetchAdminAiPrices, saveAdminAiPrices, type AdminAiPrices } from '@/lib/admin-ai-prices-client';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const EMPTY: AdminAiPrices = {
  aiBuildPerLink: 1,
  aiAssist: 0.5,
  aiMenuPerImage: 1,
  aiSearch: 0,
};

function toField(value: number): string {
  return String(value);
}

export function AiPricesAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const [form, setForm] = React.useState({
    aiBuildPerLink: toField(EMPTY.aiBuildPerLink),
    aiAssist: toField(EMPTY.aiAssist),
    aiMenuPerImage: toField(EMPTY.aiMenuPerImage),
    aiSearch: toField(EMPTY.aiSearch),
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const applyPrices = React.useCallback((prices: AdminAiPrices) => {
    setForm({
      aiBuildPerLink: toField(prices.aiBuildPerLink),
      aiAssist: toField(prices.aiAssist),
      aiMenuPerImage: toField(prices.aiMenuPerImage),
      aiSearch: toField(prices.aiSearch),
    });
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminAiPrices();
    setLoading(false);
    if (res.error || !res.prices) {
      setError(res.error || 'Çmimet nuk u ngarkuan.');
      return;
    }
    applyPrices(res.prices);
  }, [applyPrices]);

  React.useEffect(() => {
    if (!user || !isPlatformAdmin) return;
    void load();
  }, [user, isPlatformAdmin, load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await saveAdminAiPrices({
      aiBuildPerLink: Number(String(form.aiBuildPerLink).replace(',', '.')),
      aiAssist: Number(String(form.aiAssist).replace(',', '.')),
      aiMenuPerImage: Number(String(form.aiMenuPerImage).replace(',', '.')),
      aiSearch: Number(String(form.aiSearch).replace(',', '.')),
    });
    setSaving(false);
    if (res.error || !res.prices) {
      setError(res.error || 'Ruajtja dështoi.');
      return;
    }
    applyPrices(res.prices);
    setSaved(true);
  };

  if (!user || !isPlatformAdmin) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={<SparkleIcon size={22} weight="duotone" />}
        eyebrow="Financa"
        title="Çmimet e përdorimit AI"
        description="Këto tarifa shfaqen te Përdorimi AI dhe zbatohen te faturimi me Boost Coins."
      />

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}
      {saved ? (
        <Alert severity="success" sx={{ borderRadius: 2 }} onClose={() => setSaved(false)}>
          Çmimet u ruajtën.
        </Alert>
      ) : null}

      <Box sx={{ ...productPanelSx, p: 2.5, maxWidth: 560 }}>
        {loading ? (
          <ContentBlockSkeleton rows={4} rowHeight={72} />
        ) : (
          <Stack spacing={2.25} sx={productFieldSx}>
            <Typography variant="body2" color="text.secondary">
              Vlerat janë në Boost Coins. 0 do të thotë falas.
            </Typography>
            <TextField
              label="AI Build — BC për link"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              value={form.aiBuildPerLink}
              onChange={(e) => setForm((f) => ({ ...f, aiBuildPerLink: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Shkruaj me AI — BC për përdorim"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              value={form.aiAssist}
              onChange={(e) => setForm((f) => ({ ...f, aiAssist: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Import menuje — BC për foto"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              value={form.aiMenuPerImage}
              onChange={(e) => setForm((f) => ({ ...f, aiMenuPerImage: e.target.value }))}
              fullWidth
            />
            <TextField
              label="AI Search — BC për kërkim"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
              value={form.aiSearch}
              onChange={(e) => setForm((f) => ({ ...f, aiSearch: e.target.value }))}
              fullWidth
            />
            <Box>
              <Button variant="contained" onClick={() => void handleSave()} disabled={saving} sx={productButtonSx}>
                {saving ? 'Duke ruajtur…' : 'Ruaj çmimet'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
