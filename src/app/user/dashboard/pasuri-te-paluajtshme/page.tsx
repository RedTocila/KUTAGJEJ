'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import { RealEstateListingForm } from '@/components/real-estate/real-estate-listing-form';
import { CarListingForm } from '@/components/cars/car-listing-form';
import { JobListingForm } from '@/components/jobs/job-listing-form';
import { JobEmployerVerificationCard } from '@/components/jobs/job-employer-verification-card';
import { MarketplaceListingForm } from '@/components/marketplace/marketplace-listing-form';
import { BusinessListingForm } from '@/components/businesses/business-listing-form';
import { ProfessionalListingForm } from '@/components/professionals/professional-listing-form';
import { listCategoriesPublic } from '@/lib/listings-client';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';
import type { ListingCategory, ListingCategoryKey } from '@/types/listing-category';

type Phase =
  | 'choose'
  | 'real-estate-form'
  | 'cars-form'
  | 'jobs-form'
  | 'marketplace-form'
  | 'businesses-form'
  | 'professionals-form'
  | 'unsupported';

function categoryIcon(key: ListingCategoryKey) {
  switch (key) {
    case 'real-estate':
      return BuildingsIcon;
    case 'job-listings':
      return BriefcaseIcon;
    case 'cars':
      return CarIcon;
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

export default function UserPostListingPage() {
  const router = useRouter();
  const { user } = useUser();

  const [phase, setPhase] = React.useState<Phase>('choose');
  const [picked, setPicked] = React.useState<ListingCategory | null>(null);
  const [categories, setCategories] = React.useState<ListingCategory[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = React.useState(true);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) return;
    if (!canPublish) {
      router.replace(paths.user.dashboard);
    }
  }, [user, canPublish, router]);

  React.useEffect(() => {
    if (!user || !canPublish) return;
    let cancelled = false;
    setLoadingCategories(true);
    setLoadError(null);
    void (async () => {
      const res = await listCategoriesPublic();
      if (cancelled) return;
      if (res.error) {
        setLoadError(res.error);
        setCategories([]);
      } else {
        setCategories(res.categories ?? []);
      }
      setLoadingCategories(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, canPublish]);

  const handlePickCategory = (cat: ListingCategory) => {
    setPicked(cat);
    if (cat.key === 'real-estate') {
      setPhase('real-estate-form');
    } else if (cat.key === 'cars') {
      setPhase('cars-form');
    } else if (cat.key === 'job-listings') {
      setPhase('jobs-form');
    } else if (cat.key === 'marketplace') {
      setPhase('marketplace-form');
    } else if (cat.key === 'businesses') {
      setPhase('businesses-form');
    } else if (cat.key === 'professionals') {
      setPhase('professionals-form');
    } else {
      setPhase('unsupported');
    }
  };

  const handleBackToCategories = () => {
    setPicked(null);
    setPhase('choose');
  };

  if (!user) return null;
  if (!canPublish) return null;

  return (
    <Stack spacing={3}>
      {phase === 'choose' ? (
        <>
          <Stack spacing={0.5}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Posto njoftim
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              Zgjidh kategorinë e njoftimit. Kategoritë dhe titujt e tyre vijnë nga paneli i administratorit (Kategoritë).
            </Typography>
          </Stack>

          {loadError ? (
            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
              {loadError}
            </Alert>
          ) : null}

          {loadingCategories ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : categories.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              Nuk ka kategori të konfiguruara. Një administrator duhet të shtojë kategoritë te Paneli → Kategoritë.
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              {categories.map((cat) => {
                const Icon = categoryIcon(cat.key);
                return (
                  <Card
                    key={cat.key}
                    variant="outlined"
                    sx={{ borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
                  >
                    <CardActionArea onClick={() => handlePickCategory(cat)} sx={{ alignItems: 'stretch', height: '100%' }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                          <Box
                            sx={{
                              p: 1.25,
                              borderRadius: 2,
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark'
                                  ? 'rgba(118, 186, 27, 0.12)'
                                  : 'rgba(118, 186, 27, 0.14)',
                              color: 'primary.main',
                              display: 'flex',
                            }}
                          >
                            <Icon size={28} weight="duotone" />
                          </Box>
                          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                              {cat.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {cat.key === 'real-estate'
                                ? 'Apartament, vilë, tokë dhe të tjera — plotësoni formularin më poshtë.'
                                : cat.key === 'cars'
                                  ? 'Makina, SUV, kamionë dhe të tjera — plotësoni formularin me detajet e automjetit.'
                                  : cat.key === 'job-listings'
                                    ? 'Postoni një njoftim pune — plotësoni industrinë, kërkesat dhe pagën.'
                                    : cat.key === 'marketplace'
                                      ? 'Shisni, blini ose jepni me qira artikuj — plotësoni formularin e tregut.'
                                      : cat.key === 'businesses'
                                        ? 'Biznese dhe lokale — formulari i dedikuar aktivizohet së shpejti.'
                                        : cat.key === 'professionals'
                                          ? 'Profesionistë dhe freelance — formulari i dedikuar aktivizohet së shpejti.'
                                          : 'Postimi për këtë kategori do të aktivizohet së shpejti.'}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          )}
        </>
      ) : null}

      {phase === 'real-estate-form' ? (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Posto njoftim
              </Typography>
              {picked ? (
                <Typography variant="body2" color="text.secondary">
                  Kategoria: <strong>{picked.title}</strong>
                </Typography>
              ) : null}
            </Stack>
            <Button variant="outlined" onClick={handleBackToCategories} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
              Ndrysho kategorinë
            </Button>
          </Stack>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <RealEstateListingForm
                onSuccess={() => router.push(`${paths.user.myRealEstateListings}?submitted=pending`)}
                backHref={paths.user.myRealEstateListings}
                backLabel="Njoftimet e mia"
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {phase === 'cars-form' ? (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Posto njoftim
              </Typography>
              {picked ? (
                <Typography variant="body2" color="text.secondary">
                  Kategoria: <strong>{picked.title}</strong>
                </Typography>
              ) : null}
            </Stack>
            <Button variant="outlined" onClick={handleBackToCategories} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
              Ndrysho kategorinë
            </Button>
          </Stack>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <CarListingForm
                onSuccess={() => router.push(`${paths.user.myRealEstateListings}?submitted=pending`)}
                backHref={paths.user.myRealEstateListings}
                backLabel="Njoftimet e mia"
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {phase === 'jobs-form' ? (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Posto njoftim pune
              </Typography>
              {picked ? (
                <Typography variant="body2" color="text.secondary">
                  Kategoria: <strong>{picked.title}</strong>
                </Typography>
              ) : null}
            </Stack>
            <Button variant="outlined" onClick={handleBackToCategories} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
              Ndrysho kategorinë
            </Button>
          </Stack>

          <JobEmployerVerificationCard />

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <JobListingForm
                onSuccess={() => router.push(`${paths.user.myRealEstateListings}?submitted=pending`)}
                backHref={paths.user.myRealEstateListings}
                backLabel="Njoftimet e mia"
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {phase === 'businesses-form' ? (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Posto profil biznesi
              </Typography>
              {picked ? (
                <Typography variant="body2" color="text.secondary">
                  Kategoria: <strong>{picked.title}</strong>
                </Typography>
              ) : null}
            </Stack>
            <Button variant="outlined" onClick={handleBackToCategories} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
              Ndrysho kategorinë
            </Button>
          </Stack>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <BusinessListingForm
                onSuccess={() => router.push(paths.user.businessesListing)}
                backHref={paths.user.businessesListing}
                backLabel="Biznese"
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {phase === 'professionals-form' ? (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Posto profil profesionisti
              </Typography>
              {picked ? (
                <Typography variant="body2" color="text.secondary">
                  Kategoria: <strong>{picked.title}</strong>
                </Typography>
              ) : null}
            </Stack>
            <Button variant="outlined" onClick={handleBackToCategories} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
              Ndrysho kategorinë
            </Button>
          </Stack>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <ProfessionalListingForm
                onSuccess={() => router.push(paths.user.professionalsListing)}
                backHref={paths.user.professionalsListing}
                backLabel="Profesionistë"
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {phase === 'marketplace-form' ? (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Posto njoftim tregu
              </Typography>
              {picked ? (
                <Typography variant="body2" color="text.secondary">
                  Kategoria: <strong>{picked.title}</strong>
                </Typography>
              ) : null}
            </Stack>
            <Button variant="outlined" onClick={handleBackToCategories} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
              Ndrysho kategorinë
            </Button>
          </Stack>

          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <MarketplaceListingForm
                onSuccess={() => router.push(`${paths.user.myRealEstateListings}?submitted=pending`)}
                backHref={paths.user.myRealEstateListings}
                backLabel="Njoftimet e mia"
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {phase === 'unsupported' && picked ? (
        <Stack spacing={3}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Posto njoftim
            </Typography>
            <Button variant="outlined" onClick={handleBackToCategories}>
              Ndrysho kategorinë
            </Button>
          </Stack>
          <Alert severity="info" sx={{ borderRadius: 1.5 }}>
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
