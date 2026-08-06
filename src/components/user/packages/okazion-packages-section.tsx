'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Minus as MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { useUser } from '@/hooks/use-user';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
} from '@/lib/listings-client';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import { OKAZION_ACCENT, OKAZION_ACCENT_SOFT } from '@/lib/home-categories';
import {
  applyOkazionVoucher,
  buyOkazionWithCredits,
  listOkazionPackages,
  listOkazionVouchers,
} from '@/lib/payments-client';
import { paths } from '@/paths';
import type { OkazionPackage, OkazionVoucher } from '@/types/payment';
import {
  PackageCheckoutCard,
  SectionBlock,
  SoftChip,
  accentButtonSx,
  formatBc,
  formatEur,
} from './package-ui';

const FALLBACK_OKAZION_PACKAGES: OkazionPackage[] = [
  {
    id: 'okazion-5',
    days: 5,
    priceBc: 100,
    priceEur: 5,
    labelSq: '5 ditë OKAZION',
    labelEn: '5 Days OKAZION Listing',
  },
];

type PickerListing = {
  key: string;
  kind: ListingMetricKind;
  listingId: string;
  title: string;
  categoryLabel: string;
  imageUrl: string | null;
};

function coverImage(urls?: string[] | null) {
  const first = Array.isArray(urls) ? urls.find(Boolean) : null;
  return first ? String(first) : null;
}

function pickerKindIcon(kind: ListingMetricKind): PhosphorIcon {
  switch (kind) {
    case 'real-estate':
      return BuildingsIcon;
    case 'car':
      return CarIcon;
    case 'job':
      return BriefcaseIcon;
    case 'marketplace':
      return StorefrontIcon;
    default:
      return BuildingsIcon;
  }
}

function checkoutOkazionHref(packageId: string, quantity: number) {
  const q = new URLSearchParams({
    kind: 'okazion',
    packageId,
    quantity: String(quantity),
    returnTo: `${paths.user.packagesExtra}?assignOkazion=1`,
  });
  return `${paths.user.checkout}?${q.toString()}`;
}

async function loadApprovedListingsForPicker(): Promise<PickerListing[]> {
  const [re, cars, jobs, mkt] = await Promise.all([
    listMyRealEstateListings(),
    listMyCarListings(),
    listMyJobListings(),
    listMyMarketplaceListings(),
  ]);

  const out: PickerListing[] = [];
  for (const l of re.listings ?? []) {
    if (l.status !== 'approved') continue;
    out.push({
      key: `real-estate:${l.id}`,
      kind: 'real-estate',
      listingId: l.id,
      title: l.title,
      categoryLabel: 'Pasuri',
      imageUrl: coverImage(l.imageUrls),
    });
  }
  for (const l of cars.listings ?? []) {
    if (l.status !== 'approved') continue;
    const title = [l.make, l.model, l.variant].filter(Boolean).join(' ') || 'Makinë';
    out.push({
      key: `car:${l.id}`,
      kind: 'car',
      listingId: l.id,
      title,
      categoryLabel: 'Makina',
      imageUrl: coverImage(l.imageUrls),
    });
  }
  for (const l of jobs.listings ?? []) {
    if (l.status !== 'approved') continue;
    out.push({
      key: `job:${l.id}`,
      kind: 'job',
      listingId: l.id,
      title: l.title,
      categoryLabel: 'Punë',
      imageUrl: coverImage(l.imageUrls),
    });
  }
  for (const l of mkt.listings ?? []) {
    if (l.status !== 'approved') continue;
    out.push({
      key: `marketplace:${l.id}`,
      kind: 'marketplace',
      listingId: l.id,
      title: l.title,
      categoryLabel: 'Tregu',
      imageUrl: coverImage(l.imageUrls),
    });
  }
  return out;
}

export function OkazionPackagesSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checkSession } = useUser();
  const balance = Number(user?.boostCredits) || 0;

  const [packages, setPackages] = React.useState<OkazionPackage[]>(FALLBACK_OKAZION_PACKAGES);
  const [vouchers, setVouchers] = React.useState<OkazionVoucher[]>([]);
  const [quantity, setQuantity] = React.useState(1);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [activeVoucher, setActiveVoucher] = React.useState<OkazionVoucher | null>(null);
  const [pickerListings, setPickerListings] = React.useState<PickerListing[]>([]);
  const [pickerLoading, setPickerLoading] = React.useState(false);
  const [pickerQuery, setPickerQuery] = React.useState('');
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState(false);
  const pickerSearchRef = React.useRef<HTMLInputElement | null>(null);

  const unused = vouchers.filter((v) => v.status === 'unused');

  const reloadVouchers = React.useCallback(async () => {
    const res = await listOkazionVouchers(true);
    if (!res.error) setVouchers(res.vouchers ?? []);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pkgs, vouch] = await Promise.all([listOkazionPackages(), listOkazionVouchers(true)]);
      if (cancelled) return;
      if (pkgs.packages?.length) setPackages(pkgs.packages);
      if (!vouch.error) setVouchers(vouch.vouchers ?? []);
      if (searchParams.get('assignOkazion') === '1' && (vouch.vouchers?.length ?? 0) > 0) {
        const first = (vouch.vouchers ?? []).find((v) => v.status === 'unused');
        if (first) {
          setActiveVoucher(first);
          setAssignOpen(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  React.useEffect(() => {
    if (!assignOpen) return;
    let cancelled = false;
    setPickerLoading(true);
    setPickerQuery('');
    setSelectedKey(null);
    void loadApprovedListingsForPicker().then((items) => {
      if (cancelled) return;
      setPickerListings(items);
      setPickerLoading(false);
    });
    const focusTimer = window.setTimeout(() => pickerSearchRef.current?.focus(), 50);
    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
    };
  }, [assignOpen]);

  const filteredPickerListings = React.useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return pickerListings;
    return pickerListings.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.categoryLabel.toLowerCase().includes(q),
    );
  }, [pickerListings, pickerQuery]);

  const openAssign = (voucher: OkazionVoucher) => {
    setActiveVoucher(voucher);
    setAssignOpen(true);
    setError(null);
  };

  const closeAssign = () => {
    setAssignOpen(false);
    setActiveVoucher(null);
    if (searchParams.get('assignOkazion') === '1') {
      router.replace(paths.user.packagesExtra);
    }
  };

  const onBuyCard = (pkg: OkazionPackage) => {
    router.push(checkoutOkazionHref(pkg.id, quantity));
  };

  const onBuyBc = async (pkg: OkazionPackage) => {
    setBusyId(pkg.id);
    setError(null);
    setSuccess(null);
    const result = await buyOkazionWithCredits(pkg.id, quantity);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await checkSession();
    setSuccess(result.message || 'OKAZION u blë me Boost Coins.');
    await reloadVouchers();
    if (result.voucher && quantity === 1) {
      openAssign(result.voucher);
    }
  };

  const onApply = async () => {
    if (!activeVoucher || !selectedKey) return;
    const listing = pickerListings.find((l) => l.key === selectedKey);
    if (!listing) return;
    setApplying(true);
    setError(null);
    const result = await applyOkazionVoucher({
      voucherId: activeVoucher.id,
      kind: listing.kind,
      listingId: listing.listingId,
    });
    setApplying(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(result.message || 'Njoftimi u bë OKAZION.');
    await reloadVouchers();
    closeAssign();
  };

  const pkg = packages[0] || FALLBACK_OKAZION_PACKAGES[0];
  const totalEur = pkg.priceEur * quantity;
  const totalBc = pkg.priceBc * quantity;
  const canAfford = balance >= totalBc;
  const busy = busyId === pkg.id;

  return (
    <SectionBlock
      icon={SealPercentIcon}
      title="OKAZION"
      description="Shitje të shpejta — njoftimi shfaqet me temë të kuqe në OKAZION për 5 ditë. Vlen për prona, makina, pune dhe tregun."
      accent="error"
      chips={
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <SoftChip label={`${formatBc(balance)} BC`} color="error" />
          {unused.length > 0 ? (
            <SoftChip label={`${unused.length} për t'u aplikuar`} color="error" />
          ) : null}
        </Stack>
      }
    >
      {error ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {unused.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {unused.map((v) => (
            <Stack
              key={v.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: OKAZION_ACCENT,
                bgcolor: OKAZION_ACCENT_SOFT,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 750 }}>
                {v.days} ditë OKAZION · e papërdorur
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => openAssign(v)}
                sx={{ fontWeight: 800 }}
              >
                Zgjidh njoftimin
              </Button>
            </Stack>
          ))}
        </Stack>
      ) : null}

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Sasia (stoko për më vonë):
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            color="error"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            sx={{ minWidth: 36, px: 0 }}
            aria-label="Zvogëlo"
          >
            <MinusIcon size={14} weight="bold" />
          </Button>
          <Typography sx={{ fontWeight: 800, minWidth: 28, textAlign: 'center' }}>{quantity}</Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            disabled={quantity >= 50}
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            sx={{ minWidth: 36, px: 0 }}
            aria-label="Rrit"
          >
            <PlusIcon size={14} weight="bold" />
          </Button>
        </Stack>
      </Stack>

      <PackageCheckoutCard
        title={quantity > 1 ? `${pkg.labelSq} ×${quantity}` : pkg.labelSq}
        subtitle="OKAZION 5 ditë · temë e kuqe + renditje e favorizuar"
        badge="5 ditë"
        accent="error"
        actions={
          <>
            <Button
              size="small"
              variant="contained"
              color="error"
              disabled={busy}
              onClick={() => onBuyCard(pkg)}
              sx={{
                ...accentButtonSx('error'),
                flex: 1,
                borderRadius: 1.75,
                py: 1,
                fontSize: '0.85rem',
                fontWeight: 850,
              }}
            >
              {formatEur(totalEur)}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={busy || !canAfford}
              onClick={() => void onBuyBc(pkg)}
              startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <BoostCoinIcon size={14} />}
              sx={{
                ...accentButtonSx('error', 'outlined'),
                flex: 1,
                borderRadius: 1.75,
                py: 1,
                fontSize: '0.85rem',
                fontWeight: 850,
              }}
            >
              {formatBc(totalBc)} BC
            </Button>
          </>
        }
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Grow: 5 OKAZION · Elite: 10 OKAZION — aktivizohen te Shpalljet e mia ose kur postoni njoftim.
      </Typography>

      <ProductDialog open={assignOpen} onClose={closeAssign} fullWidth maxWidth="sm">
        <ProductDialogTitle
          onClose={closeAssign}
          subtitle={
            activeVoucher
              ? `${activeVoucher.days} ditë OKAZION do të aplikohen në njoftimin e zgjedhur`
              : undefined
          }
        >
          Zgjidh njoftimin OKAZION
        </ProductDialogTitle>
        {!pickerLoading && pickerListings.length > 0 ? (
          <Box sx={{ px: 2.5, pb: 1 }}>
            <TextField
              inputRef={pickerSearchRef}
              fullWidth
              placeholder="Kërko njoftimin…"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      {React.createElement(MagnifyingGlassIcon, { size: 20 })}
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        ) : null}
        <ProductDialogContent sx={{ pt: 0, maxHeight: 360, overflowY: 'auto' }}>
          {pickerLoading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : pickerListings.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Nuk keni njoftime të aprovuara. Shtoni një njoftim, pastaj aplikoni OKAZION.
            </Alert>
          ) : filteredPickerListings.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Nuk u gjet asnjë njoftim.
            </Typography>
          ) : (
            <List disablePadding>
              {filteredPickerListings.map((item) => {
                const KindIcon = pickerKindIcon(item.kind);
                return (
                  <ListItemButton
                    key={item.key}
                    selected={selectedKey === item.key}
                    onClick={() => setSelectedKey(item.key)}
                    sx={{ borderRadius: 1.5, mb: 0.5, gap: 1.25, py: 1 }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        flexShrink: 0,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'grid',
                        placeItems: 'center',
                        color: OKAZION_ACCENT,
                      }}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          sizes="48px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <KindIcon size={22} weight="duotone" />
                      )}
                    </Box>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>}
                      secondary={
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {item.categoryLabel}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={closeAssign} sx={{ fontWeight: 700 }}>
            Më vonë
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!selectedKey || applying || pickerListings.length === 0}
            onClick={() => void onApply()}
            startIcon={applying ? <CircularProgress size={16} color="inherit" /> : <SealPercentIcon size={18} />}
            sx={{ fontWeight: 800 }}
          >
            Apliko OKAZION
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </SectionBlock>
  );
}
