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
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useLifetimePackageDiscount } from '@/hooks/use-lifetime-package-discount';
import { useUser } from '@/hooks/use-user';
import {
  listMyListings,
} from '@/lib/listings-client';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import { localizedLabel } from '@/lib/language';
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
  DualPayOfferRow,
  PackageEurPrice,
  SectionBlock,
  SoftChip,
  dualPayButtonSx,
  formatBc,
} from './package-ui';

const FALLBACK_OKAZION_PACKAGES: OkazionPackage[] = [
  {
    id: 'okazion-5',
    days: 5,
    priceBc: 200,
    priceEur: 12,
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
  return out;
}

export function OkazionPackagesSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useCopy();
  const { language } = useLanguage();
  const { user, checkSession } = useUser();
  const lifetimePercent = useLifetimePackageDiscount();
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
  const pkgTitle = localizedLabel(language, pkg.labelSq, pkg.labelEn);
  const totalEur = pkg.priceEur * quantity;
  const totalBc = pkg.priceBc * quantity;
  const canAfford = balance >= totalBc;
  const busy = busyId === pkg.id;

  return (
    <SectionBlock
      icon={SealPercentIcon}
      title="OKAZION"
      info={t.packages.okazionInfo}
      infoAriaLabel={t.packages.packageInfoAria}
      accent="error"
      chips={
        unused.length > 0 ? (
          <SoftChip label={`${unused.length} për t'u aplikuar`} color="error" />
        ) : undefined
      }
    >
      {error ? (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {unused.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 1.25 }}>
          {unused.map((v) => (
            <Stack
              key={v.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                p: 1.35,
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

      <DualPayOfferRow
        title={quantity > 1 ? `${pkgTitle} ×${quantity}` : pkgTitle}
        badge={t.packages.daysShort(pkg.days)}
        accent="error"
        highlighted
        meta={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Sasia (stoko për më vonë)
            </Typography>
            <Stack
              direction="row"
              spacing={0}
              sx={{
                alignItems: 'center',
                borderRadius: 999,
                border: '1px solid',
                borderColor: `${OKAZION_ACCENT}55`,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                overflow: 'hidden',
              }}
            >
              <Button
                size="small"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                sx={{
                  minWidth: 34,
                  px: 0,
                  py: 0.55,
                  borderRadius: 0,
                  color: OKAZION_ACCENT,
                  '&:hover': { bgcolor: `${OKAZION_ACCENT}14` },
                }}
                aria-label={t.packages.decrease}
              >
                <MinusIcon size={13} weight="bold" />
              </Button>
              <Typography
                sx={{
                  fontWeight: 850,
                  minWidth: 28,
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {quantity}
              </Typography>
              <Button
                size="small"
                disabled={quantity >= 50}
                onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                sx={{
                  minWidth: 34,
                  px: 0,
                  py: 0.55,
                  borderRadius: 0,
                  color: OKAZION_ACCENT,
                  '&:hover': { bgcolor: `${OKAZION_ACCENT}14` },
                }}
                aria-label={t.packages.increase}
              >
                <PlusIcon size={13} weight="bold" />
              </Button>
            </Stack>
          </Stack>
        }
        actions={
          <>
            <Button
              size="small"
              variant="contained"
              color="error"
              disabled={busy}
              onClick={() => onBuyCard(pkg)}
              sx={dualPayButtonSx('error')}
            >
              <PackageEurPrice listPrice={totalEur} percent={lifetimePercent} onAccent />
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={busy || !canAfford}
              onClick={() => void onBuyBc(pkg)}
              startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <BoostCoinIcon size={14} />}
              sx={dualPayButtonSx('error', 'outlined')}
            >
              {formatBc(totalBc)} BC
            </Button>
          </>
        }
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, px: 0.25 }}>
        {t.packages.okazionGrowEliteNote}
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
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : pickerListings.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {t.packages.noApprovedListingsOkazion}
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
