'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ChartLine as ChartLineIcon } from '@phosphor-icons/react/dist/ssr/ChartLine';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';

import { VerticalIcon } from '@/components/public/vertical-icon';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { getUserPortalAccountCategoryLabel } from '@/lib/user-portal-account-label';
import type { PublicContract } from '@/types/contract';

export default function UserDashboardPage() {
  const { user } = useUser();

  const subscriberKindFilter = user?.accountType === 'business' || user?.role === 'business-user' ? 'company' : 'agent';
  const [plans, setPlans] = React.useState<PublicContract[]>([]);
  const [plansLoading, setPlansLoading] = React.useState(true);
  const [plansError, setPlansError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setPlansLoading(true);
    setPlansError(null);
    void (async () => {
      const { contracts, error } = await listPublicContracts({ subscriberKind: subscriberKindFilter });
      if (cancelled) return;
      if (error) {
        setPlansError(error);
        setPlans([]);
      } else {
        setPlans(contracts ?? []);
      }
      setPlansLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, subscriberKindFilter]);

  const greetingName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.firstName || user?.businessName || user?.email || 'Përdorues';

  const categoryLabel = getUserPortalAccountCategoryLabel(user ?? null);
  const isBusiness = user?.accountType === 'business' || user?.role === 'business-user';
  const showRealEstateListing =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Përshëndetje, {greetingName}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
          Ja përmbledhja e panelit tuaj. Përdorni menunë majtas për të lëvizur ndërmjet faqeve.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {showRealEstateListing ? (
          <Grid size={{ xs: 12 }}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2,
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <VerticalIcon verticalId="real-estate" size={54} decorative />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Posto njoftim
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Zgjidh kategorinë e njoftimit, pastaj plotëso formularin (fushat në anglisht për prona).
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="contained"
                  component={RouterLink}
                  href={paths.user.realEstateListing}
                  sx={{ flexShrink: 0 }}
                >
                  Add listing
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Card
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${theme.palette.primary.dark}22 0%, transparent 55%)`
                  : `linear-gradient(135deg, ${theme.palette.primary.light}33 0%, transparent 50%)`,
            }}
          >
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.main'),
                    color: 'primary.contrastText',
                  }}
                >
                  {React.createElement(UserGearIcon, { size: 24, weight: 'duotone' })}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Llogaria
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Kategoria
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                {categoryLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {isBusiness
                  ? 'Menaxhoni të dhënat e biznesit nga faqja e profilit.'
                  : 'Të dhënat tuaja personale janë të dukshme te profili.'}
              </Typography>
              <Button
                component={RouterLink}
                href={paths.user.profile}
                endIcon={React.createElement(ArrowRightIcon, { size: 18 })}
                sx={{ alignSelf: 'flex-start', mt: 2 }}
              >
                Shiko profilin
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                  }}
                >
                  {React.createElement(ChartLineIcon, { size: 24, weight: 'duotone' })}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Aktiviteti
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Statistikat dhe historiku i aktivitetit do të shfaqen këtu sapo të jenë gati në platformë.
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Nuk ka të dhëna për të shfaqur ende.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                  }}
                >
                  {React.createElement(SparkleIcon, { size: 24, weight: 'duotone' })}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Hapat e ardhshëm
                </Typography>
              </Stack>
              <Stack spacing={1.25} sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  • Plotësoni profilin nëse mungojnë të dhëna.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Eksploroni faqet e reja sapo të shtohen në panel.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Ndërroni modalitetin e temës nga shiriti i sipërm nëse dëshironi.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {isBusiness ? 'Paketat për ju' : 'Paketat për ty'}
              </Typography>
              {plansLoading ? (
                <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : null}
              {plansError ? (
                <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                  {plansError}
                </Alert>
              ) : null}
              {!plansLoading && !plansError && plans.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Për momentin nuk ka plan aktiv me çmim për llogarinë tuaj.
                </Typography>
              ) : null}
              {!plansLoading && !plansError && plans.length > 0 ? (
                <Stack spacing={2}>
                  {plans.map((plan) => (
                    <Box
                      key={plan.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>{plan.title}</Typography>
                      {plan.listingCategoryTitle ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {plan.listingCategoryTitle}
                        </Typography>
                      ) : null}
                      <Stack direction="row" sx={{ flexWrap: 'wrap', mt: 1.5, gap: 1 }}>
                        {plan.priceOptions.map((opt) => (
                          <Chip
                            key={opt.months}
                            size="small"
                            label={`${opt.labelSq}: ${opt.price} €`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                justifyContent: 'space-between',
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    color: 'text.secondary',
                  }}
                >
                  {React.createElement(GearSixIcon, { size: 26, weight: 'duotone' })}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Cilësimet dhe ndihmë
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Për ndryshime të ardhshme të llogarisë ose mbështetje, këtu do të shfaqen opsionet përkatëse.
                  </Typography>
                </Box>
              </Stack>
              <Button variant="outlined" component={RouterLink} href={paths.user.profile}>
                Hap profilin
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Stack>
  );
}
