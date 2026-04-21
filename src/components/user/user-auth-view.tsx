'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { HandWaving as HandWavingIcon } from '@phosphor-icons/react/dist/ssr/HandWaving';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import { BrandLogo } from '@/components/brand/brand-logo';
import { config } from '@/config';
import { authClient } from '@/lib/auth/client';
import { getDefaultAuthenticatedPath } from '@/lib/auth/post-login-path';

const { name: siteName } = config.site;

const signInSchema = zod.object({
  email: zod.string().min(1, { message: 'Emaili është i detyrueshëm' }).email('Email i pavlefshëm'),
  password: zod.string().min(6, { message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere' }),
});

type SignInValues = zod.infer<typeof signInSchema>;

const individualRegisterSchema = zod
  .object({
    firstName: zod.string().min(1, { message: 'Emri është i detyrueshëm' }),
    lastName: zod.string().min(1, { message: 'Mbiemri është i detyrueshëm' }),
    email: zod.string().min(1, { message: 'Emaili është i detyrueshëm' }).email('Email i pavlefshëm'),
    password: zod.string().min(6, { message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere' }),
    confirmPassword: zod.string().min(1, { message: 'Konfirmo fjalëkalimin' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Fjalëkalimet nuk përputhen',
    path: ['confirmPassword'],
  });

const businessRegisterSchema = zod
  .object({
    nipt: zod.string().min(1, { message: 'NIPT është i detyrueshëm' }),
    businessName: zod.string().min(1, { message: 'Emri i biznesit është i detyrueshëm' }),
    businessOwner: zod.string().min(1, { message: 'Pronari i biznesit është i detyrueshëm' }),
    businessCategory: zod.string().min(1, { message: 'Kategoria është e detyrueshme' }),
    email: zod.string().min(1, { message: 'Emaili është i detyrueshëm' }).email('Email i pavlefshëm'),
    password: zod.string().min(6, { message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere' }),
    confirmPassword: zod.string().min(1, { message: 'Konfirmo fjalëkalimin' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Fjalëkalimet nuk përputhen',
    path: ['confirmPassword'],
  });

type IndividualRegisterValues = zod.infer<typeof individualRegisterSchema>;
type BusinessRegisterValues = zod.infer<typeof businessRegisterSchema>;

const fieldLabelSx = (error: boolean) => ({
  mb: 1,
  fontWeight: 600,
  color: error ? 'error.main' : 'common.white',
  fontSize: '0.75rem',
});

const outlinedDarkSx = {
  color: 'common.white',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.35)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'common.white' },
  '& input::placeholder': { color: 'rgba(255,255,255,0.6)', opacity: 1 },
};

function SignInFields({
  control,
  errors,
  showPassword,
  setShowPassword,
}: {
  control: ReturnType<typeof useForm<SignInValues>>['control'];
  errors: ReturnType<typeof useForm<SignInValues>>['formState']['errors'];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  return (
    <Stack spacing={2.25}>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormControl error={Boolean(errors.email)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.email))}>
              Email
            </Typography>
            <OutlinedInput {...field} id="signin-email" placeholder="ju@shembull.com" type="email" sx={outlinedDarkSx} />
            {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <FormControl error={Boolean(errors.password)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.password))}>
              Fjalëkalimi
            </Typography>
            <OutlinedInput
              {...field}
              id="signin-password"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              sx={outlinedDarkSx}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                    edge="end"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    {showPassword ? <EyeIcon size={20} /> : <EyeSlashIcon size={20} />}
                  </IconButton>
                </InputAdornment>
              }
            />
            {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
    </Stack>
  );
}

function RegisterFieldsIndividual({
  control,
  errors,
  showPassword,
  setShowPassword,
}: {
  control: ReturnType<typeof useForm<IndividualRegisterValues>>['control'];
  errors: ReturnType<typeof useForm<IndividualRegisterValues>>['formState']['errors'];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Controller
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormControl error={Boolean(errors.firstName)} fullWidth>
              <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.firstName))}>
                Emri
              </Typography>
              <OutlinedInput {...field} autoComplete="given-name" placeholder="Emri" sx={outlinedDarkSx} />
              {errors.firstName ? <FormHelperText>{errors.firstName.message}</FormHelperText> : null}
            </FormControl>
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormControl error={Boolean(errors.lastName)} fullWidth>
              <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.lastName))}>
                Mbiemri
              </Typography>
              <OutlinedInput {...field} autoComplete="family-name" placeholder="Mbiemri" sx={outlinedDarkSx} />
              {errors.lastName ? <FormHelperText>{errors.lastName.message}</FormHelperText> : null}
            </FormControl>
          )}
        />
      </Box>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormControl error={Boolean(errors.email)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.email))}>
              Email
            </Typography>
            <OutlinedInput {...field} autoComplete="email" placeholder="ju@shembull.com" type="email" sx={outlinedDarkSx} />
            {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <FormControl error={Boolean(errors.password)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.password))}>
              Fjalëkalimi
            </Typography>
            <OutlinedInput
              {...field}
              autoComplete="new-password"
              placeholder="Të paktën 6 karaktere"
              type={showPassword ? 'text' : 'password'}
              sx={outlinedDarkSx}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                    edge="end"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    {showPassword ? <EyeIcon size={20} /> : <EyeSlashIcon size={20} />}
                  </IconButton>
                </InputAdornment>
              }
            />
            {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <FormControl error={Boolean(errors.confirmPassword)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.confirmPassword))}>
              Konfirmo fjalëkalimin
            </Typography>
            <OutlinedInput
              {...field}
              autoComplete="new-password"
              placeholder="Përsërit fjalëkalimin"
              type={showPassword ? 'text' : 'password'}
              sx={outlinedDarkSx}
            />
            {errors.confirmPassword ? <FormHelperText>{errors.confirmPassword.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
    </Stack>
  );
}

function RegisterFieldsBusiness({
  control,
  errors,
  showPassword,
  setShowPassword,
}: {
  control: ReturnType<typeof useForm<BusinessRegisterValues>>['control'];
  errors: ReturnType<typeof useForm<BusinessRegisterValues>>['formState']['errors'];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="nipt"
        render={({ field }) => (
          <FormControl error={Boolean(errors.nipt)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.nipt))}>
              NIPT
            </Typography>
            <OutlinedInput {...field} placeholder="Numri i identifikimit të biznesit" sx={outlinedDarkSx} />
            {errors.nipt ? <FormHelperText>{errors.nipt.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="businessName"
        render={({ field }) => (
          <FormControl error={Boolean(errors.businessName)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.businessName))}>
              Emri i biznesit
            </Typography>
            <OutlinedInput {...field} placeholder="Emri i kompanisë ose aktivitetit" sx={outlinedDarkSx} />
            {errors.businessName ? <FormHelperText>{errors.businessName.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="businessOwner"
        render={({ field }) => (
          <FormControl error={Boolean(errors.businessOwner)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.businessOwner))}>
              Pronari i biznesit
            </Typography>
            <OutlinedInput {...field} placeholder="Emri i plotë i përfaqësuesit" sx={outlinedDarkSx} />
            {errors.businessOwner ? <FormHelperText>{errors.businessOwner.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="businessCategory"
        render={({ field }) => (
          <FormControl error={Boolean(errors.businessCategory)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.businessCategory))}>
              Kategoria e biznesit
            </Typography>
            <OutlinedInput {...field} placeholder="p.sh. Restorant, Shërbime, Retail…" sx={outlinedDarkSx} />
            {errors.businessCategory ? <FormHelperText>{errors.businessCategory.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormControl error={Boolean(errors.email)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.email))}>
              Email
            </Typography>
            <OutlinedInput {...field} autoComplete="email" placeholder="ju@biznesi.com" type="email" sx={outlinedDarkSx} />
            {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <FormControl error={Boolean(errors.password)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.password))}>
              Fjalëkalimi
            </Typography>
            <OutlinedInput
              {...field}
              autoComplete="new-password"
              placeholder="Të paktën 6 karaktere"
              type={showPassword ? 'text' : 'password'}
              sx={outlinedDarkSx}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
                    edge="end"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    {showPassword ? <EyeIcon size={20} /> : <EyeSlashIcon size={20} />}
                  </IconButton>
                </InputAdornment>
              }
            />
            {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <FormControl error={Boolean(errors.confirmPassword)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.confirmPassword))}>
              Konfirmo fjalëkalimin
            </Typography>
            <OutlinedInput
              {...field}
              autoComplete="new-password"
              placeholder="Përsërit fjalëkalimin"
              type={showPassword ? 'text' : 'password'}
              sx={outlinedDarkSx}
            />
            {errors.confirmPassword ? <FormHelperText>{errors.confirmPassword.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
    </Stack>
  );
}

export function UserAuthView() {
  const [tab, setTab] = React.useState(0);
  const [registerKind, setRegisterKind] = React.useState<'individual' | 'business'>('individual');
  const [showPwSignIn, setShowPwSignIn] = React.useState(false);
  const [showPwReg, setShowPwReg] = React.useState(false);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const individualForm = useForm<IndividualRegisterValues>({
    resolver: zodResolver(individualRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const businessForm = useForm<BusinessRegisterValues>({
    resolver: zodResolver(businessRegisterSchema),
    defaultValues: {
      nipt: '',
      businessName: '',
      businessOwner: '',
      businessCategory: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSignIn = signInForm.handleSubmit(async (values) => {
    signInForm.clearErrors('root');
    const { error, user } = await authClient.signIn(values);
    if (error) {
      signInForm.setError('root', { type: 'server', message: error });
      return;
    }
    if (!user) {
      signInForm.setError('root', { type: 'server', message: 'Identifikimi dështoi.' });
      return;
    }
    window.location.href = getDefaultAuthenticatedPath(user);
  });

  const onRegisterIndividual = individualForm.handleSubmit(async (values) => {
    individualForm.clearErrors('root');
    const { error, user } = await authClient.register({
      userType: 'individual',
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
    });
    if (error) {
      individualForm.setError('root', { type: 'server', message: error });
      return;
    }
    if (!user) {
      individualForm.setError('root', { type: 'server', message: 'Regjistrimi dështoi.' });
      return;
    }
    window.location.href = getDefaultAuthenticatedPath(user);
  });

  const onRegisterBusiness = businessForm.handleSubmit(async (values) => {
    businessForm.clearErrors('root');
    const { error, user } = await authClient.register({
      userType: 'business',
      nipt: values.nipt,
      businessName: values.businessName,
      businessOwner: values.businessOwner,
      businessCategory: values.businessCategory,
      email: values.email,
      password: values.password,
    });
    if (error) {
      businessForm.setError('root', { type: 'server', message: error });
      return;
    }
    if (!user) {
      businessForm.setError('root', { type: 'server', message: 'Regjistrimi dështoi.' });
      return;
    }
    window.location.href = getDefaultAuthenticatedPath(user);
  });

  const signInRoot = signInForm.formState.errors.root;
  const indRoot = individualForm.formState.errors.root;
  const busRoot = businessForm.formState.errors.root;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor:
          'radial-gradient(ellipse 120% 80% at 50% -20%, #1a4301 0%, #0d2201 35%, #050804 70%, #000000 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Card
          elevation={10}
          sx={{
            overflow: 'hidden',
            borderRadius: 4,
            backdropFilter: 'blur(18px)',
            background: 'linear-gradient(145deg, rgba(13,34,8,0.97), rgba(5,13,6,0.99))',
            border: '1px solid rgba(166, 226, 46, 0.18)',
            boxShadow: '0 32px 80px rgba(5, 13, 6, 0.75), 0 0 48px rgba(118, 186, 27, 0.12)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 }, borderRight: { md: '1px solid rgba(200, 239, 152, 0.12)' } }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'primary.light', letterSpacing: 1 }}>
                    {siteName}
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'common.white', mt: 0.5, fontWeight: 700, lineHeight: 1.2 }}>
                    Mirë se vini
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.85)', mt: 1, maxWidth: 420 }}>
                    Hyni në llogarinë tuaj ose krijoni një të re në pak hapa — e thjeshtë dhe e shpejtë.
                  </Typography>
                </Box>

                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  variant="fullWidth"
                  sx={{
                    minHeight: 44,
                    '& .MuiTab-root': {
                      color: 'rgba(255,255,255,0.65)',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem',
                    },
                    '& .Mui-selected': { color: 'primary.light !important' },
                    '& .MuiTabs-indicator': { bgcolor: 'primary.light', height: 3, borderRadius: 1 },
                  }}
                >
                  <Tab label="Hyr" disableRipple />
                  <Tab label="Regjistrohu" disableRipple />
                </Tabs>

                {tab === 0 ? (
                  <Box component="form" onSubmit={onSignIn} noValidate>
                    <Stack spacing={2.5}>
                      <SignInFields
                        control={signInForm.control}
                        errors={signInForm.formState.errors}
                        showPassword={showPwSignIn}
                        setShowPassword={setShowPwSignIn}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={signInForm.formState.isSubmitting}
                        fullWidth
                        sx={{ py: 1.5, color: 'common.white' }}
                      >
                        {signInForm.formState.isSubmitting ? 'Duke u identifikuar…' : 'Vazhdo në panel'}
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600, display: 'block', mb: 1 }}>
                      Lloji i llogarisë
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={registerKind}
                      onChange={(_, v) => v && setRegisterKind(v)}
                      sx={{
                        mb: 2.5,
                        gap: 1,
                        '& .MuiToggleButtonGroup-grouped': {
                          border: '1px solid rgba(166, 226, 46, 0.28) !important',
                          borderRadius: '12px !important',
                          color: 'rgba(255,255,255,0.85)',
                          textTransform: 'none',
                          fontWeight: 600,
                          py: 1.25,
                          '&.Mui-selected': {
                            bgcolor: 'rgba(166, 226, 46, 0.18)',
                            color: 'primary.light',
                          },
                        },
                      }}
                    >
                      <ToggleButton value="individual">
                        <UserIcon style={{ marginRight: 8 }} size={20} />
                        Individ
                      </ToggleButton>
                      <ToggleButton value="business">
                        <BuildingsIcon style={{ marginRight: 8 }} size={20} />
                        Biznes
                      </ToggleButton>
                    </ToggleButtonGroup>

                    {registerKind === 'individual' ? (
                      <Box component="form" onSubmit={onRegisterIndividual} noValidate>
                        <Stack spacing={2.5}>
                          <RegisterFieldsIndividual
                            control={individualForm.control}
                            errors={individualForm.formState.errors}
                            showPassword={showPwReg}
                            setShowPassword={setShowPwReg}
                          />
                          <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={individualForm.formState.isSubmitting}
                            fullWidth
                            sx={{ py: 1.5, color: 'common.white' }}
                          >
                            {individualForm.formState.isSubmitting ? 'Duke u krijuar llogaria…' : 'Krijo llogari'}
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Box component="form" onSubmit={onRegisterBusiness} noValidate>
                        <Stack spacing={2.5}>
                          <RegisterFieldsBusiness
                            control={businessForm.control}
                            errors={businessForm.formState.errors}
                            showPassword={showPwReg}
                            setShowPassword={setShowPwReg}
                          />
                          <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={businessForm.formState.isSubmitting}
                            fullWidth
                            sx={{ py: 1.5, color: 'common.white' }}
                          >
                            {businessForm.formState.isSubmitting ? 'Duke u krijuar llogaria…' : 'Krijo llogari biznesi'}
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}

                {tab === 0 && signInRoot ? (
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'error.dark', border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="body2" sx={{ color: 'error.light' }}>
                      {signInRoot.message}
                    </Typography>
                  </Box>
                ) : null}
                {tab === 1 && registerKind === 'individual' && indRoot ? (
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'error.dark', border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="body2" sx={{ color: 'error.light' }}>
                      {indRoot.message}
                    </Typography>
                  </Box>
                ) : null}
                {tab === 1 && registerKind === 'business' && busRoot ? (
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'error.dark', border: '1px solid', borderColor: 'error.main' }}>
                    <Typography variant="body2" sx={{ color: 'error.light' }}>
                      {busRoot.message}
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </CardContent>

            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                justifyContent: 'center',
                p: 4,
                bgcolor:
                  'radial-gradient(circle at top left, rgba(166,226,46,0.22), rgba(34,197,94,0.12), transparent 58%)',
              }}
            >
              <Stack spacing={3}>
                <BrandLogo
                  height={100}
                  imgSx={{
                    filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.4))',
                    maxWidth: 200,
                  }}
                />
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        color: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'rgba(166, 226, 46, 0.12)',
                        border: '1px solid rgba(166, 226, 46, 0.25)',
                        mt: 0.25,
                      }}
                    >
                      <HandWavingIcon size={22} weight="duotone" />
                    </Box>
                    <Typography variant="body1" sx={{ color: 'common.white', fontWeight: 600, lineHeight: 1.45 }}>
                      Një vend për individët dhe bizneset — menaxhoni gjithçka nga paneli juaj.
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        color: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'rgba(166, 226, 46, 0.12)',
                        border: '1px solid rgba(166, 226, 46, 0.25)',
                        mt: 0.25,
                      }}
                    >
                      <SparkleIcon size={22} weight="duotone" />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.92)', lineHeight: 1.55 }}>
                      Pas hyrjes do të ridrejtoheni te paneli juaj personal. Mund të ndërroni llogarinë ose të dilni kur të
                      doni.
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
