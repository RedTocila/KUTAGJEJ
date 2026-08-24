'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Stack } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { CrownSimple as CrownSimpleIcon } from '@phosphor-icons/react/dist/ssr/CrownSimple';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { AddListingPickerDialog } from '@/components/user/add-listing-picker-dialog';
import { PostListingAiAssist } from '@/components/user/post-listing-ai-assist';
import {
  PostListingFormFieldsSkeleton,
  PostListingFormSurface,
  PostListingHeader,
} from '@/components/user/post-listing-header';
import { OkazionTheme } from '@/components/user/okazion-theme';
import { OKAZION_ACCENT, OKAZION_ACCENT_SOFT } from '@/lib/home-categories';
import {
  PREMIUM_AMBER,
  PREMIUM_AMBER_SOFT,
} from '@/components/user/premium-boost-upsell';
import { aiDraftToInitialListing } from '@/lib/ai-draft-to-listing';
import {
  consumeAiListingDraft,
  removeAiListingDraftFromQueue,
  type AiListingDraft,
} from '@/lib/ai-listing-draft';
import { listCategoriesPublic } from '@/lib/listings-client';
import type { CarMineListing, JobMineListing, MarketplaceMineListing } from '@/lib/listings-client';
import {
  fetchCategoryQuotas,
  isCategoryQuotaAvailable,
  type CategoryQuotaSnapshot,
} from '@/lib/listing-category-quota-client';
import {
  isListingFormCategoryKey,
  prefetchListingForm,
} from '@/lib/listing-form-loaders';
import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';
import { useCopy } from '@/hooks/use-copy';
import type { ListingCategory, ListingCategoryKey } from '@/types/listing-category';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';

const RealEstateListingForm = dynamic(
  () => import('@/components/real-estate/real-estate-listing-form').then((m) => m.RealEstateListingForm),
  { loading: () => <PostListingFormFieldsSkeleton /> },
);
const CarListingForm = dynamic(
  () => import('@/components/cars/car-listing-form').then((m) => m.CarListingForm),
  { loading: () => <PostListingFormFieldsSkeleton /> },
);
const JobListingForm = dynamic(
  () => import('@/components/jobs/job-listing-form').then((m) => m.JobListingForm),
  { loading: () => <PostListingFormFieldsSkeleton /> },
);
const MarketplaceListingForm = dynamic(
  () => import('@/components/marketplace/marketplace-listing-form').then((m) => m.MarketplaceListingForm),
  { loading: () => <PostListingFormFieldsSkeleton /> },
);
const BusinessListingForm = dynamic(
  () => import('@/components/businesses/business-listing-form').then((m) => m.BusinessListingForm),
  { loading: () => <PostListingFormFieldsSkeleton /> },
);
const ProfessionalListingForm = dynamic(
  () => import('@/components/professionals/professional-listing-form').then((m) => m.ProfessionalListingForm),
  { loading: () => <PostListingFormFieldsSkeleton /> },
);

type Phase =
  | 'choose'
  | 'real-estate-form'
  | 'cars-form'
  | 'jobs-form'
  | 'marketplace-form'
  | 'businesses-form'
  | 'professionals-form'
  | 'quota-blocked'
  | 'unsupported';

const KNOWN_CATEGORY_KEYS: ListingCategoryKey[] = [
  'real-estate',
  'cars',
  'job-listings',
  'marketplace',
  'businesses',
  'professionals',
];

function fallbackCategory(key: ListingCategoryKey): ListingCategory {
  const titles: Record<ListingCategoryKey, string> = {
    'real-estate': 'Pasuri të paluajtshme',
    cars: 'Makina',
    'job-listings': 'Vende pune',
    marketplace: 'Tregu',
    businesses: 'Biznese',
    professionals: 'Profesionistë',
  };
  return {
    key,
    title: titles[key] ?? key,
    slug: key,
    listingTypes: [],
  };
}

function phaseFromCategoryKey(key: string): Phase | null {
  switch (key) {
    case 'real-estate':
      return 'real-estate-form';
    case 'cars':
      return 'cars-form';
    case 'job-listings':
      return 'jobs-form';
    case 'marketplace':
      return 'marketplace-form';
    case 'businesses':
      return 'businesses-form';
    case 'professionals':
      return 'professionals-form';
    default:
      return null;
  }
}

function initialPhase(category: string | null): Phase {
  if (!category) return 'choose';
  const formPhase = phaseFromCategoryKey(category);
  if (formPhase) return formPhase;
  if (KNOWN_CATEGORY_KEYS.includes(category as ListingCategoryKey)) return 'unsupported';
  return 'choose';
}

function phaseIcon(phase: Phase): PhosphorIcon {
  switch (phase) {
    case 'cars-form':
      return CarIcon;
    case 'jobs-form':
      return BriefcaseIcon;
    case 'marketplace-form':
      return StorefrontIcon;
    case 'businesses-form':
      return BuildingOfficeIcon;
    case 'professionals-form':
      return UsersIcon;
    default:
      return BuildingsIcon;
  }
}

function phaseCategory(phase: Phase): ListingCategoryKey | null {
  switch (phase) {
    case 'real-estate-form':
      return 'real-estate';
    case 'cars-form':
      return 'cars';
    case 'jobs-form':
      return 'job-listings';
    case 'marketplace-form':
      return 'marketplace';
    case 'businesses-form':
      return 'businesses';
    case 'professionals-form':
      return 'professionals';
    default:
      return null;
  }
}

export default function UserPostListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const t = useCopy();

  const categoryFromUrl = searchParams.get('category');
  const [phase, setPhase] = React.useState<Phase>(() => initialPhase(categoryFromUrl));
  const [picked, setPicked] = React.useState<ListingCategory | null>(() =>
    categoryFromUrl && KNOWN_CATEGORY_KEYS.includes(categoryFromUrl as ListingCategoryKey)
      ? fallbackCategory(categoryFromUrl as ListingCategoryKey)
      : null,
  );
  const [categories, setCategories] = React.useState<ListingCategory[]>([]);
  const [categoryQuotas, setCategoryQuotas] = React.useState<CategoryQuotaSnapshot | null>(null);
  const [quotasReady, setQuotasReady] = React.useState(false);
  const wantsAi = searchParams.get('ai') === '1';
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';
  const aiDraftId = searchParams.get('draftId');
  const aiReturnHref = paths.user.aiImport;
  const [aiInitial, setAiInitial] = React.useState<Record<string, unknown> | null>(null);
  const [aiReady, setAiReady] = React.useState(!wantsAi);
  const [aiFormKey, setAiFormKey] = React.useState(0);
  const appliedCategoryRef = React.useRef<string | null>(categoryFromUrl);
  const aiConsumedRef = React.useRef(false);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (isListingFormCategoryKey(categoryFromUrl)) prefetchListingForm(categoryFromUrl);
  }, [categoryFromUrl]);

  React.useEffect(() => {
    if (!user) return;
    if (!canPublish) {
      router.replace(paths.user.dashboard);
    }
  }, [user, canPublish, router]);

  React.useEffect(() => {
    let cancelled = false;
    void listCategoriesPublic().then((catRes) => {
      if (!cancelled) setCategories(catRes.categories ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!user || !canPublish) return;
    let cancelled = false;
    void fetchCategoryQuotas().then((quotaRes) => {
      if (cancelled) return;
      setCategoryQuotas(quotaRes.snapshot ?? null);
      setQuotasReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user, canPublish]);

  const handlePickCategory = React.useCallback((cat: ListingCategory) => {
    setPicked(cat);
    if (isListingFormCategoryKey(cat.key)) prefetchListingForm(cat.key);
    if (categoryQuotas && !isCategoryQuotaAvailable(categoryQuotas, cat.key)) {
      setPhase('quota-blocked');
      return;
    }
    const next = phaseFromCategoryKey(cat.key);
    setPhase(next ?? 'unsupported');
  }, [categoryQuotas]);

  const applyCategoryKey = React.useCallback(
    (raw: string) => {
      const fromApi = categories.find((c) => c.key === raw);
      if (fromApi) {
        appliedCategoryRef.current = raw;
        handlePickCategory(fromApi);
        return;
      }
      if (KNOWN_CATEGORY_KEYS.includes(raw as ListingCategoryKey)) {
        appliedCategoryRef.current = raw;
        handlePickCategory(fallbackCategory(raw as ListingCategoryKey));
      }
    },
    [categories, handlePickCategory],
  );

  React.useEffect(() => {
    const raw = searchParams.get('category');
    if (!raw) return;
    if (appliedCategoryRef.current === raw && phase !== 'choose') return;
    applyCategoryKey(raw);
  }, [searchParams, applyCategoryKey, phase]);

  React.useEffect(() => {
    if (!quotasReady || !picked) return;
    if (!isCategoryQuotaAvailable(categoryQuotas, picked.key)) {
      setPhase('quota-blocked');
    }
  }, [quotasReady, categoryQuotas, picked]);

  React.useEffect(() => {
    if (!wantsAi) {
      setAiReady(true);
      return;
    }
    if (aiConsumedRef.current) return;
    const category = searchParams.get('category') as ListingCategoryKey | null;
    if (!category) {
      setAiReady(true);
      return;
    }
    const draftId = searchParams.get('draftId');
    const draft: AiListingDraft | null = consumeAiListingDraft(category, draftId);
    aiConsumedRef.current = true;
    if (draft) setAiInitial(aiDraftToInitialListing(draft));
    setAiReady(true);
  }, [wantsAi, searchParams]);

  const handleSheetPick = (key: ListingCategoryKey, opts?: { okazion?: boolean; premium?: boolean }) => {
    if (categoryQuotas && !isCategoryQuotaAvailable(categoryQuotas, key)) {
      const fromApi = categories.find((c) => c.key === key);
      setPicked(fromApi ?? fallbackCategory(key));
      setPhase('quota-blocked');
      return;
    }
    applyCategoryKey(key);
    const q = new URLSearchParams({ category: key });
    if (opts?.okazion || searchParams.get('okazion') === '1') q.set('okazion', '1');
    if (opts?.premium || searchParams.get('premium') === '1') q.set('premium', '1');
    hardNavigate(`${paths.user.realEstateListing}?${q.toString()}`);
  };

  const handleAiApply = React.useCallback((initial: Record<string, unknown>) => {
    setAiInitial(initial);
    setAiFormKey((k) => k + 1);
  }, []);

  const handleFormSuccess = React.useCallback(() => {
    if (wantsAi && aiDraftId) removeAiListingDraftFromQueue(aiDraftId);
    hardNavigate(paths.user.dashboard);
  }, [wantsAi, aiDraftId]);

  if (user && !canPublish) return null;

  const formMeta: Partial<Record<Phase, { title: string }>> = {
    'real-estate-form': { title: 'Posto njoftim' },
    'cars-form': { title: 'Posto njoftim' },
    'jobs-form': { title: 'Posto njoftim pune' },
    'businesses-form': { title: 'Posto profil biznesi' },
    'professionals-form': { title: 'Posto profil profesionisti' },
    'marketplace-form': { title: 'Posto njoftim tregu' },
  };

  const activeMeta = formMeta[phase];
  const showFormShell = Boolean(activeMeta);
  const activeCategory = phaseCategory(phase);
  const showPicker = phase === 'choose' && !categoryFromUrl;

  return (
    <Stack spacing={2.5}>
      {showPicker ? (
        <AddListingPickerDialog
          open
          onClose={() => hardNavigate(paths.user.dashboard)}
          onPick={handleSheetPick}
          initialOkazion={searchParams.get('okazion') === '1'}
          initialPremium={searchParams.get('premium') === '1'}
        />
      ) : null}

      {showFormShell && activeMeta ? (
        <OkazionTheme enabled={wantsOkazion}>
          <>
          <PostListingHeader
            icon={
              wantsOkazion
                ? SealPercentIcon
                : wantsPremium
                  ? CrownSimpleIcon
                  : phaseIcon(phase)
            }
            title={
              wantsOkazion
                ? 'Posto OKAZION'
                : wantsPremium
                  ? 'Posto Premium'
                  : activeMeta.title
            }
            iconColor={
              wantsOkazion ? OKAZION_ACCENT : wantsPremium ? PREMIUM_AMBER : undefined
            }
            iconBgcolor={
              wantsOkazion
                ? OKAZION_ACCENT_SOFT
                : wantsPremium
                  ? PREMIUM_AMBER_SOFT
                  : undefined
            }
            closeHref={wantsAi ? aiReturnHref : paths.home}
          />

          <PostListingFormSurface>
            {activeCategory ? (
              <PostListingAiAssist category={activeCategory} onApply={handleAiApply} />
            ) : null}
            {aiReady ? (
              <>
                {phase === 'real-estate-form' ? (
                  <RealEstateListingForm
                    key={`re-${aiFormKey}`}
                    initialListing={(aiInitial as RealEstateMineListing | null) ?? null}
                    onSuccess={handleFormSuccess}
                  />
                ) : null}
                {phase === 'cars-form' ? (
                  <CarListingForm
                    key={`cars-${aiFormKey}`}
                    initialListing={(aiInitial as CarMineListing | null) ?? null}
                    onSuccess={handleFormSuccess}
                  />
                ) : null}
                {phase === 'jobs-form' ? (
                  <JobListingForm
                    key={`jobs-${aiFormKey}`}
                    initialListing={(aiInitial as JobMineListing | null) ?? null}
                    onSuccess={handleFormSuccess}
                  />
                ) : null}
                {phase === 'businesses-form' ? (
                  <BusinessListingForm
                    key={`biz-${aiFormKey}`}
                    aiPrefill={aiInitial}
                    onSuccess={handleFormSuccess}
                  />
                ) : null}
                {phase === 'professionals-form' ? (
                  <ProfessionalListingForm
                    key={`pro-${aiFormKey}`}
                    aiPrefill={aiInitial}
                    onSuccess={handleFormSuccess}
                  />
                ) : null}
                {phase === 'marketplace-form' ? (
                  <MarketplaceListingForm
                    key={`mkt-${aiFormKey}`}
                    initialListing={(aiInitial as MarketplaceMineListing | null) ?? null}
                    onSuccess={handleFormSuccess}
                  />
                ) : null}
              </>
            ) : (
              <PostListingFormFieldsSkeleton />
            )}
          </PostListingFormSurface>
          </>
        </OkazionTheme>
      ) : null}

      {phase === 'quota-blocked' && picked ? (
        <Stack spacing={2.5}>
          <PostListingHeader
            icon={phaseIcon(
              picked.key === 'cars'
                ? 'cars-form'
                : picked.key === 'job-listings'
                  ? 'jobs-form'
                  : picked.key === 'marketplace'
                    ? 'marketplace-form'
                    : picked.key === 'businesses'
                      ? 'businesses-form'
                      : picked.key === 'professionals'
                        ? 'professionals-form'
                        : 'real-estate-form',
            )}
            title={picked.title}
            description={t.picker.quotaUnavailable}
          />
          <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
            {t.picker.quotaExhausted}
          </Alert>
          <Button variant="contained" onClick={() => hardNavigate(paths.user.dashboard)}>
            {t.common.myPanel}
          </Button>
        </Stack>
      ) : null}

      {phase === 'unsupported' && picked ? (
        <Stack spacing={2.5}>
          <PostListingHeader
            icon={BuildingsIcon}
            title="Posto njoftim"
            description="Kjo kategori ende nuk ofron formular postimi nga portali."
          />
          <Alert severity="info" sx={{ borderRadius: 2.5 }}>
            Kategoria <strong>{picked.title}</strong> ende nuk ofron formular postimi nga portali. Për momentin mund të
            postoni vetëm njoftime për <strong>prona</strong>.
          </Alert>
          {categories.some((c) => c.key === 'real-estate') ? (
            <Button
              variant="contained"
              onClick={() => {
                const re = categories.find((c) => c.key === 'real-estate');
                if (re) handlePickCategory(re);
              }}
            >
              Kal te prona
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
