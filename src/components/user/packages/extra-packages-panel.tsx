'use client';

import * as React from 'react';
import Image from 'next/image';
import RouterLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { StarFour as StarFourIcon } from '@phosphor-icons/react/dist/ssr/StarFour';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import type { PremiumPackage, PremiumVoucher } from '@/types/payment';
import { paths } from '@/paths';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import {
  convertListingQuotas,
  fetchConvertibleQuotas,
  type QuotaCounts,
  type QuotaKind,
} from '@/lib/listing-quota-convert-client';
import { listMyListings } from '@/lib/listings-client';
import {
  applyPremiumVoucher,
  buyPremiumWithCredits,
  listPremiumPackages,
  listPremiumVouchers,
} from '@/lib/payments-client';
import { useCopy } from '@/hooks/use-copy';
import { useLifetimePackageDiscount } from '@/hooks/use-lifetime-package-discount';
import { useUser } from '@/hooks/use-user';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { ListRowsSkeleton, PackageRowsSkeleton } from '@/components/core/content-skeletons';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { TransientSuccessAlert } from '@/components/core/transient-success-alert';

import { BcPurchaseDialog } from './bc-purchase-dialog';
import { OkazionPackagesSection } from './okazion-packages-section';
import {
  dualPayButtonSx,
  ExtraPackageCard,
  formatBc,
  packageAccentSurfaceSx,
  PackageEurPrice,
  PurchasedVoucherStack,
  ReferralDiscountNote,
} from './package-ui';

const FALLBACK_PREMIUM_PACKAGES: PremiumPackage[] = [
  {
    id: 'premium-15',
    days: 15,
    priceBc: 200,
    priceEur: 18,
    labelSq: '15 ditë Premium',
    labelEn: '15 Days Premium Listing',
  },
  {
    id: 'premium-30',
    days: 30,
    priceBc: 300,
    priceEur: 27,
    labelSq: '30 ditë Premium',
    labelEn: '30 Days Premium Listing',
  },
];

const CONVERT_ROWS: { kind: QuotaKind; label: string }[] = [
  { kind: 'car', label: 'Makina' },
  { kind: 'product', label: 'Produkte' },
  { kind: 'apartment', label: 'Apartamente' },
  { kind: 'job', label: 'Vende pune' },
];

const EMPTY_COUNTS: QuotaCounts = { car: 0, product: 0, apartment: 0, job: 0 };
const DEFAULT_RATES: QuotaCounts = { car: 2, product: 2, apartment: 0.5, job: 0.5 };

type PickerListing = {
  key: string;
  kind: ListingMetricKind;
  listingId: string;
  title: string;
  categoryLabel: string;
  imageUrl: string | null;
};

function coverImage(imageUrls?: string[] | null): string | null {
  const first = imageUrls?.find((url) => typeof url === 'string' && url.trim());
  return first?.trim() || null;
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
    case 'businesses':
      return BuildingOfficeIcon;
    case 'professionals':
      return UsersIcon;
    default:
      return BuildingsIcon;
  }
}

function checkoutPremiumHref(packageId: string) {
  const q = new URLSearchParams({
    kind: 'premium',
    packageId,
    returnTo: `${paths.user.packagesExtra}?assignPremium=1`,
  });
  return `${paths.user.checkout}?${q.toString()}`;
}

function rawCreditsFrom(counts: QuotaCounts, rates: QuotaCounts) {
  return (
    counts.car * rates.car +
    counts.product * rates.product +
    counts.apartment * rates.apartment +
    counts.job * rates.job
  );
}

async function loadApprovedListingsForPicker(): Promise<PickerListing[]> {
  const mine = await listMyListings();

  const out: PickerListing[] = [];
  for (const l of mine.realEstate ?? []) {
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
  for (const l of mine.cars ?? []) {
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
  for (const l of mine.jobs ?? []) {
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
  for (const l of mine.marketplace ?? []) {
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
  for (const l of mine.businesses ?? []) {
    if (l.status !== 'approved') continue;
    out.push({
      key: `businesses:${l.id}`,
      kind: 'businesses',
      listingId: l.id,
      title: l.title,
      categoryLabel: 'Biznese',
      imageUrl: coverImage(l.imageUrls),
    });
  }
  for (const l of mine.professionals ?? []) {
    if (l.status !== 'approved') continue;
    out.push({
      key: `professionals:${l.id}`,
      kind: 'professionals',
      listingId: l.id,
      title: l.title,
      categoryLabel: 'Profesionistë',
      imageUrl: coverImage(l.imageUrls),
    });
  }
  return out;
}

function PremiumListingSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useCopy();
  const { user, checkSession } = useUser();
  const lifetimePercent = useLifetimePackageDiscount();
  const balance = Math.max(0, Math.round((Number(user?.boostCredits) || 0) * 10) / 10);

  const [packages, setPackages] = React.useState<PremiumPackage[]>(FALLBACK_PREMIUM_PACKAGES);
  const [unused, setUnused] = React.useState<PremiumVoucher[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [confirmPackage, setConfirmPackage] = React.useState<PremiumPackage | null>(null);

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [activeVoucher, setActiveVoucher] = React.useState<PremiumVoucher | null>(null);
  const [pickerLoading, setPickerLoading] = React.useState(false);
  const [pickerListings, setPickerListings] = React.useState<PickerListing[]>([]);
  const [pickerQuery, setPickerQuery] = React.useState('');
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState(false);
  const pickerSearchRef = React.useRef<HTMLInputElement>(null);

  const reloadVouchers = React.useCallback(async () => {
    const { vouchers } = await listPremiumVouchers(true);
    setUnused(vouchers ?? []);
    return vouchers ?? [];
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ packages: pkgs }, vouchers] = await Promise.all([listPremiumPackages(), reloadVouchers()]);
      if (cancelled) return;
      if (pkgs?.length) setPackages(pkgs);
      if (searchParams.get('assignPremium') === '1' && vouchers.length > 0) {
        setActiveVoucher(vouchers[0]);
        setAssignOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadVouchers, searchParams]);

  React.useEffect(() => {
    if (!assignOpen) {
      setPickerQuery('');
      return;
    }
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
      (item) => item.title.toLowerCase().includes(q) || item.categoryLabel.toLowerCase().includes(q)
    );
  }, [pickerListings, pickerQuery]);

  const openAssign = (voucher: PremiumVoucher) => {
    setActiveVoucher(voucher);
    setAssignOpen(true);
    setError(null);
  };

  const closeAssign = () => {
    setAssignOpen(false);
    setActiveVoucher(null);
    if (searchParams.get('assignPremium') === '1') {
      router.replace(paths.user.packagesExtra);
    }
  };

  const onBuyCard = (pkg: PremiumPackage) => {
    router.push(checkoutPremiumHref(pkg.id));
  };

  const onBuyBc = async (pkg: PremiumPackage): Promise<boolean> => {
    setBusyId(pkg.id);
    setError(null);
    setSuccess(null);
    const result = await buyPremiumWithCredits(pkg.id);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return false;
    }
    await checkSession();
    setConfirmPackage(null);
    setSuccess(result.message || 'Premium u blë me Boost Coins.');
    if (result.voucher) {
      await reloadVouchers();
      openAssign(result.voucher);
    }
    return true;
  };

  const onApply = async () => {
    if (!activeVoucher || !selectedKey) return;
    const listing = pickerListings.find((l) => l.key === selectedKey);
    if (!listing) return;
    setApplying(true);
    setError(null);
    const result = await applyPremiumVoucher({
      voucherId: activeVoucher.id,
      kind: listing.kind,
      listingId: listing.listingId,
    });
    setApplying(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(result.message || 'Njoftimi u bë Premium.');
    await reloadVouchers();
    closeAssign();
  };

  return (
    <Stack spacing={1.25}>
      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <TransientSuccessAlert message={success} onDismiss={() => setSuccess(null)} sx={{ borderRadius: 2 }} />

      <Stack spacing={1.75}>
        {packages.map((pkg) => {
          const busy = busyId === pkg.id;
          const canAfford = balance >= pkg.priceBc;
          const highlighted = pkg.days === 15;
          const packageVouchers = unused.filter((voucher) => voucher.days === pkg.days);
          const hasFooter = packageVouchers.length > 0;
          return (
            <ExtraPackageCard
              key={pkg.id}
              icon={StarFourIcon}
              category="Premium"
              title={t.packages.premiumBoostTitle(pkg.days)}
              subtitle={t.packages.premiumBoostSubtitle}
              badge={highlighted ? t.packages.bestValue : null}
              accent="warning"
              highlighted={highlighted}
              details={[
                t.packages.premiumFeaturePlacement,
                t.packages.premiumFeatureClicks,
                t.packages.premiumFeatureDays(pkg.days),
              ]}
              footer={
                hasFooter ? (
                  <PurchasedVoucherStack
                    vouchers={packageVouchers}
                    accent="warning"
                    label={(days, count) =>
                      count === 1
                        ? t.packages.unusedPremiumDays(days)
                        : `${count} × ${days} ditë Premium · të papërdorura`
                    }
                    actionLabel={t.packages.selectListing}
                    onSelect={openAssign}
                  />
                ) : undefined
              }
              actions={
                <>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    disabled={busy}
                    onClick={() => onBuyCard(pkg)}
                    sx={dualPayButtonSx('warning')}
                  >
                    <PackageEurPrice listPrice={pkg.priceEur} percent={lifetimePercent} onAccent />
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={busy || !canAfford}
                    onClick={() => setConfirmPackage(pkg)}
                    startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <BoostCoinIcon size={16} />}
                    sx={dualPayButtonSx('warning', 'outlined')}
                  >
                    {formatBc(pkg.priceBc)} BC
                  </Button>
                </>
              }
            />
          );
        })}
      </Stack>

      <BcPurchaseDialog
        open={Boolean(confirmPackage)}
        packageLabel={confirmPackage ? t.packages.premiumBoostTitle(confirmPackage.days) : ''}
        priceBc={confirmPackage?.priceBc || 0}
        busy={Boolean(confirmPackage && busyId === confirmPackage.id)}
        onClose={() => setConfirmPackage(null)}
        onConfirm={() => {
          if (!confirmPackage) return;
          void onBuyBc(confirmPackage);
        }}
      />

      <ProductDialog open={assignOpen} onClose={closeAssign} fullWidth maxWidth="sm">
        <ProductDialogTitle
          onClose={closeAssign}
          subtitle={activeVoucher ? t.packages.applyDaysToListing(activeVoucher.days) : undefined}
        >
          {t.packages.selectPremiumListing}
        </ProductDialogTitle>
        {!pickerLoading && pickerListings.length > 0 ? (
          <Box sx={{ px: 2.5, pb: 1 }}>
            <TextField
              inputRef={pickerSearchRef}
              fullWidth
              placeholder={t.packages.searchListing}
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
            <ListRowsSkeleton count={5} rowHeight={64} />
          ) : pickerListings.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {t.packages.noApprovedListingsPremium}
            </Alert>
          ) : filteredPickerListings.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {t.packages.noListingFound}
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
                        color: 'primary.main',
                      }}
                    >
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} />
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
            disabled={!selectedKey || applying || pickerListings.length === 0}
            onClick={() => void onApply()}
            startIcon={applying ? <CircularProgress size={16} color="inherit" /> : <StarFourIcon size={18} />}
            sx={{ fontWeight: 800 }}
          >
            Apliko Premium
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}

function ConvertListingSection() {
  const t = useCopy();
  const { checkSession } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [hasPaidPlan, setHasPaidPlan] = React.useState(false);
  const [available, setAvailable] = React.useState<QuotaCounts>(EMPTY_COUNTS);
  const [rates, setRates] = React.useState<QuotaCounts>(DEFAULT_RATES);
  const [selected, setSelected] = React.useState<QuotaCounts>(EMPTY_COUNTS);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { snapshot, error: err } = await fetchConvertibleQuotas();
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    if (snapshot) {
      setHasPaidPlan(snapshot.hasPaidPlan);
      setAvailable(snapshot.available);
      setRates(snapshot.rates || DEFAULT_RATES);
      setSelected(EMPTY_COUNTS);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rawTotal = rawCreditsFrom(selected, rates);
  const awardTotal = Math.floor(rawTotal);
  const totalSelected = Object.values(selected).reduce((a, b) => a + b, 0);
  const canSubmit = hasPaidPlan && totalSelected > 0 && awardTotal >= 1 && !submitting;

  // One spacer for every row so slider tracks share the same length (apartments
  // used to stretch when its max label was shorter than cars/products).
  const valueColumnSpacer = React.useMemo(() => {
    let widest = '0 → BC 0';
    for (const { kind } of CONVERT_ROWS) {
      const max = available[kind] || 0;
      const label = `${max} → BC ${formatBc(max * (rates[kind] || 0))}`;
      if (label.length > widest.length) widest = label;
    }
    return widest;
  }, [available, rates]);

  const onConvert = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const result = await convertListingQuotas(selected);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.available) setAvailable(result.available);
    setSelected(EMPTY_COUNTS);
    setSuccess(result.message || `+${result.creditsGranted ?? 0} Boost Coins`);
    await checkSession();
  };

  return (
    <Box
      id="convert"
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: 3,
        scrollMarginTop: { xs: 96, md: 112 },
        overflow: 'hidden',
        position: 'relative',
        ...packageAccentSurfaceSx('warning'),
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.1 : 0.05)} 0%, transparent 58%)`,
        }}
      />
      <Stack direction="row" spacing={1.25} sx={{ position: 'relative', alignItems: 'flex-start', mb: 0.5 }}>
        <Box
          sx={{
            width: { xs: 44, sm: 52 },
            height: { xs: 44, sm: 52 },
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            border: '1.5px solid',
            borderColor: 'warning.main',
            bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
            color: 'warning.main',
          }}
        >
          <BoostCoinIcon size={22} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 750,
              fontSize: '0.64rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'warning.main',
              mb: 0.25,
              lineHeight: 1.2,
            }}
          >
            Conversion
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.08rem', sm: '1.22rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Convert Listing
          </Typography>
          <Typography
            sx={{
              mt: 0.4,
              fontWeight: 550,
              fontSize: '0.76rem',
              lineHeight: 1.35,
              color: 'text.secondary',
            }}
          >
            {t.packages.convertListingInfo}
          </Typography>
        </Box>
      </Stack>

      {error ? (
        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <TransientSuccessAlert message={success} onDismiss={() => setSuccess(null)} sx={{ mt: 1.5, borderRadius: 1.5 }} />

      {loading ? (
        <Box sx={{ mt: 1.5 }}>
          <PackageRowsSkeleton count={3} rowHeight={72} />
        </Box>
      ) : !hasPaidPlan ? (
        <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5 }}>
          Konvertimi është i disponueshëm kur keni një paketë të paguar aktive me kuota të lira.
        </Alert>
      ) : (
        <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
          {CONVERT_ROWS.map(({ kind, label }) => {
            const max = available[kind] || 0;
            const value = Math.min(selected[kind], max);
            const rate = rates[kind];
            const rowBc = value * rate;
            return (
              <Box key={kind} sx={{ py: 1.5 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5, gap: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    1 = BC {formatBc(rate)} · të lira {max}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Slider
                    size="small"
                    min={0}
                    max={Math.max(max, 0)}
                    step={1}
                    value={value}
                    disabled={max === 0 || submitting}
                    onChange={(_e, v) => {
                      const n = Array.isArray(v) ? v[0] : v;
                      setSelected((prev) => ({ ...prev, [kind]: n }));
                    }}
                    valueLabelDisplay="auto"
                    sx={{ flex: 1, minWidth: 0, color: 'warning.main' }}
                  />
                  {/* Shared width across rows so every slider track matches */}
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Typography
                      aria-hidden
                      sx={{
                        visibility: 'hidden',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {valueColumnSpacer}
                    </Typography>
                    <Typography
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        textAlign: 'right',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {value} → BC {formatBc(rowBc)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {!loading && hasPaidPlan ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mt: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Gjithsej:{' '}
            <Box component="span" sx={{ color: 'warning.main', fontWeight: 800 }}>
              BC {formatBc(rawTotal)}
            </Box>
            {awardTotal !== rawTotal ? (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                (merrni {awardTotal})
              </Typography>
            ) : null}
          </Typography>
          <Button
            variant="contained"
            color="warning"
            disabled={!canSubmit}
            onClick={() => void onConvert()}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <BoostCoinIcon size={18} />}
            sx={{ fontWeight: 800, alignSelf: { xs: 'stretch', sm: 'auto' } }}
          >
            Konverto
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
}

export function BoostBalanceChip({ balance }: { balance: number }) {
  return (
    <Stack
      direction="row"
      spacing={0.65}
      sx={{
        alignItems: 'center',
        px: 1.2,
        py: 0.55,
        borderRadius: 999,
        bgcolor: (t) => alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.16 : 0.12),
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.warning.main, 0.4),
        flexShrink: 0,
      }}
    >
      <BoostCoinIcon size={15} />
      <Typography
        sx={{
          fontWeight: 850,
          fontSize: '0.78rem',
          color: 'warning.main',
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatBc(balance)} BC
      </Typography>
    </Stack>
  );
}

export function ExtraPackagesPanel() {
  const t = useCopy();
  const lifetimePercent = useLifetimePackageDiscount();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#convert') return;

    let cancelled = false;
    let attempts = 0;
    let lastY = Number.NaN;
    const timers: number[] = [];

    const scrollToConvert = (behavior: ScrollBehavior) => {
      if (cancelled) return;
      const el = document.getElementById('convert');
      if (!el) {
        if (attempts < 50) {
          attempts += 1;
          timers.push(window.setTimeout(() => scrollToConvert(behavior), 60));
        }
        return;
      }
      el.scrollIntoView({ behavior, block: 'start' });
      const y = el.getBoundingClientRect().top + window.scrollY;
      // Sections above load asynchronously and push this block down — re-align until stable.
      if (!Number.isFinite(lastY) || Math.abs(y - lastY) > 12) {
        lastY = y;
        if (attempts < 50) {
          attempts += 1;
          timers.push(window.setTimeout(() => scrollToConvert('auto'), 120));
        }
      }
    };

    // Instant first jumps beat the browser's early hash scroll; a late smooth pass finishes it.
    timers.push(window.setTimeout(() => scrollToConvert('auto'), 40));
    timers.push(window.setTimeout(() => scrollToConvert('auto'), 250));
    timers.push(window.setTimeout(() => scrollToConvert('smooth'), 700));

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  return (
    <Stack spacing={1.75}>
      <ReferralDiscountNote percent={lifetimePercent} />
      <OkazionPackagesSection />
      <PremiumListingSection />
      <ConvertListingSection />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1.15,
          px: 1.6,
          py: 1.35,
          borderRadius: 3,
          border: '1px solid',
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.35),
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
            color: 'primary.main',
          }}
        >
          <ShieldCheckIcon size={18} weight="fill" />
        </Box>
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 550,
            fontSize: '0.76rem',
            lineHeight: 1.4,
            color: 'text.secondary',
          }}
        >
          {t.packages.bcPayNote}
        </Typography>
        <Box
          component={RouterLink}
          href={paths.user.packagesCredits}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            flexShrink: 0,
            color: 'primary.main',
            fontWeight: 800,
            fontSize: '0.75rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {t.packages.bcPayLearnMore}
          <CaretRightIcon size={12} weight="bold" />
        </Box>
      </Box>
    </Stack>
  );
}
