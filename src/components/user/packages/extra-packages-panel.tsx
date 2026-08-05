'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
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
  convertListingQuotas,
  fetchConvertibleQuotas,
  type QuotaCounts,
  type QuotaKind,
} from '@/lib/listing-quota-convert-client';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
} from '@/lib/listings-client';
import { listMyBusinessListings, listMyProfessionalListings } from '@/lib/directory-listings-client';
import {
  applyPremiumVoucher,
  buyPremiumWithCredits,
  fetchAutoRefreshStatus,
  listPremiumPackages,
  listPremiumVouchers,
} from '@/lib/payments-client';
import { paths } from '@/paths';
import type { AutoRefreshPackage, PremiumPackage, PremiumVoucher } from '@/types/payment';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import {
  PackageOfferRow,
  SectionBlock,
  SoftChip,
  accentButtonSx,
  formatBc,
  formatEur,
} from './package-ui';
import { OkazionPackagesSection } from './okazion-packages-section';

const FALLBACK_AUTO_PACKAGES: AutoRefreshPackage[] = [
  { id: 'auto-refresh-10', slots: 10, priceEur: 14.9, labelSq: '10 njoftime Auto-Refresh' },
  { id: 'auto-refresh-20', slots: 20, priceEur: 24.9, labelSq: '20 njoftime Auto-Refresh' },
];

const FALLBACK_PREMIUM_PACKAGES: PremiumPackage[] = [
  {
    id: 'premium-5',
    days: 5,
    priceBc: 100,
    priceEur: 9,
    labelSq: '5 ditë Premium',
    labelEn: '5 Days Premium Listing',
  },
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

function checkoutAutoRefreshHref(packageId: string) {
  const q = new URLSearchParams({
    kind: 'auto-refresh',
    packageId,
    returnTo: paths.user.packagesExtra,
  });
  return `${paths.user.checkout}?${q.toString()}`;
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
  const [re, cars, jobs, mkt, biz, pro] = await Promise.all([
    listMyRealEstateListings(),
    listMyCarListings(),
    listMyJobListings(),
    listMyMarketplaceListings(),
    listMyBusinessListings(),
    listMyProfessionalListings(),
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
  for (const l of biz.listings ?? []) {
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
  for (const l of pro.listings ?? []) {
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

function AutoRefreshSection() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState(0);
  const [used, setUsed] = React.useState(0);
  const [packages, setPackages] = React.useState<AutoRefreshPackage[]>(FALLBACK_AUTO_PACKAGES);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { status, error: err } = await fetchAutoRefreshStatus();
      if (cancelled) return;
      if (err) setError(err);
      if (status) {
        setSlots(status.slots);
        setUsed(status.used);
        if (status.packages?.length) setPackages(status.packages);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionBlock
      icon={ArrowClockwiseIcon}
      title="Auto-Refresh"
      description="Njoftimet tuaja ngrihen automatikisht në krye sipas intervalit të planit."
      chips={error ? undefined : <SoftChip label={`${used}/${slots} vende`} />}
    >
      {error ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Stack spacing={1.1}>
          {packages.map((pkg, index) => (
            <PackageOfferRow
              key={pkg.id}
              title={`${pkg.slots} vende`}
              badge={index === 1 ? <SoftChip compact label="Më e mirë" color="primary" /> : undefined}
              highlighted={index === 1}
              details={[
                `${pkg.slots} njoftime me Auto-Refresh`,
                `Aktualisht ${used}/${slots} vende në përdorim`,
                'Abonim mujor — aktivizohet pas pagesës',
                `Shton ${pkg.slots} vende në llogari`,
              ]}
              actions={
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => router.push(checkoutAutoRefreshHref(pkg.id))}
                  sx={{
                    ...accentButtonSx('primary'),
                    borderRadius: 1.75,
                    px: { xs: 1.5, sm: 2 },
                    py: 0.9,
                    minWidth: { xs: 96, sm: 112 },
                    fontSize: '0.8rem',
                  }}
                >
                  {formatEur(pkg.priceEur)}/muaj
                </Button>
              }
            />
          ))}
        </Stack>
      )}
    </SectionBlock>
  );
}

function PremiumListingSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checkSession } = useUser();
  const balance = Math.max(0, Math.floor(Number(user?.boostCredits) || 0));

  const [packages, setPackages] = React.useState<PremiumPackage[]>(FALLBACK_PREMIUM_PACKAGES);
  const [unused, setUnused] = React.useState<PremiumVoucher[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

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
      const [{ packages: pkgs }, vouchers] = await Promise.all([
        listPremiumPackages(),
        reloadVouchers(),
      ]);
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
      (item) =>
        item.title.toLowerCase().includes(q) || item.categoryLabel.toLowerCase().includes(q),
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

  const onBuyBc = async (pkg: PremiumPackage) => {
    setBusyId(pkg.id);
    setError(null);
    setSuccess(null);
    const result = await buyPremiumWithCredits(pkg.id);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await checkSession();
    setSuccess(result.message || 'Premium u blë me Boost Coins.');
    if (result.voucher) {
      await reloadVouchers();
      openAssign(result.voucher);
    }
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
    <SectionBlock
      icon={SparkleIcon}
      title="Premium Listing"
      description="Njoftimi juaj shfaqet i theksuar dhe më lart në rezultate për kohëzgjatjen e zgjedhur."
      accent="warning"
      chips={
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <SoftChip label={`${formatBc(balance)} BC`} color="warning" />
          {unused.length > 0 ? <SoftChip label={`${unused.length} për t'u aplikuar`} color="primary" /> : null}
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
                borderColor: 'warning.main',
                bgcolor: (t) => `${t.palette.warning.main}10`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 750 }}>
                {v.days} ditë Premium · e papërdorur
              </Typography>
              <Button size="small" variant="contained" color="warning" onClick={() => openAssign(v)} sx={{ fontWeight: 800 }}>
                Zgjidh njoftimin
              </Button>
            </Stack>
          ))}
        </Stack>
      ) : null}

      <Stack spacing={1.1}>
        {packages.map((pkg) => {
          const busy = busyId === pkg.id;
          const canAfford = balance >= pkg.priceBc;
          const highlighted = pkg.days === 15;
          return (
            <PackageOfferRow
              key={pkg.id}
              title={pkg.labelSq}
              badge={highlighted ? <SoftChip compact label="Rekomanduar" color="warning" /> : undefined}
              accent="warning"
              highlighted={highlighted}
              details={[
                `Premium për ${pkg.days} ditë`,
                'Renditje e favorizuar',
                'Border i theksuar në kartë',
              ]}
              actions={
                <>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    disabled={busy}
                    onClick={() => onBuyCard(pkg)}
                    startIcon={<CreditCardIcon size={14} weight="bold" />}
                    aria-label={`Paguaj me kartë ${formatEur(pkg.priceEur)}`}
                    sx={{
                      ...accentButtonSx('warning'),
                      borderRadius: 1.75,
                      px: { xs: 1.15, sm: 1.5 },
                      py: 0.85,
                      minWidth: { xs: 80, sm: 96 },
                      fontSize: '0.78rem',
                    }}
                  >
                    {formatEur(pkg.priceEur)}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={busy || !canAfford}
                    onClick={() => void onBuyBc(pkg)}
                    startIcon={
                      busy ? <CircularProgress size={12} color="inherit" /> : <BoostCoinIcon size={14} />
                    }
                    aria-label={`Paguaj me ${formatBc(pkg.priceBc)} Boost Coins`}
                    sx={{
                      ...accentButtonSx('warning', 'outlined'),
                      borderRadius: 1.75,
                      px: { xs: 1.15, sm: 1.5 },
                      py: 0.85,
                      minWidth: { xs: 80, sm: 96 },
                      fontSize: '0.78rem',
                    }}
                  >
                    {formatBc(pkg.priceBc)}
                  </Button>
                </>
              }
            />
          );
        })}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Premium nga abonimi Grow/Elite: 30 ditë — aktivizohet me butonin Premium te Shpalljet e mia.
      </Typography>

      <ProductDialog open={assignOpen} onClose={closeAssign} fullWidth maxWidth="sm">
        <ProductDialogTitle
          onClose={closeAssign}
          subtitle={
            activeVoucher
              ? `${activeVoucher.days} ditë do të aplikohen në njoftimin e zgjedhur`
              : undefined
          }
        >
          Zgjidh njoftimin Premium
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
              Nuk keni njoftime të aprovuara. Shtoni një njoftim dhe aprovoni atë, pastaj aplikoni Premium.
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
                        color: 'primary.main',
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
            disabled={!selectedKey || applying || pickerListings.length === 0}
            onClick={() => void onApply()}
            startIcon={applying ? <CircularProgress size={16} color="inherit" /> : <SparkleIcon size={18} />}
            sx={{ fontWeight: 800 }}
          >
            Apliko Premium
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </SectionBlock>
  );
}

function ConvertListingSection() {
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
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        scrollMarginTop: { xs: 96, md: 112 },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: (t) => `${t.palette.warning.main}18`,
            color: 'warning.main',
          }}
        >
          <BoostCoinIcon size={20} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: 0.4 }}>
              CONVERT LISTING
            </Typography>
            <Chip size="small" label="BOOST COINS" color="warning" sx={{ fontWeight: 700, height: 22 }} />
          </Stack>
        </Box>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
        Konvertoni kuotat e papërdorura të paketës në Boost Coins.
      </Typography>

      {error ? (
        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mt: 1.5, borderRadius: 1.5 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
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
                    sx={{ flex: 1, color: 'warning.main' }}
                  />
                  <Typography
                    sx={{
                      minWidth: 64,
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {value} → BC {formatBc(rowBc)}
                  </Typography>
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

export function ExtraPackagesPanel() {
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
    <Stack spacing={2.5}>
      <AutoRefreshSection />
      <OkazionPackagesSection />
      <PremiumListingSection />
      <ConvertListingSection />
    </Stack>
  );
}
