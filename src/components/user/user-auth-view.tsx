'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  OutlinedInput,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import RouterLink from 'next/link';
import { Controller, useForm, type Control } from 'react-hook-form';
import { z as zod } from 'zod';

import { BrandLogo } from '@/components/brand/brand-logo';
import { SearchableSelect } from '@/components/core/searchable-select';
import { useCopy } from '@/hooks/use-copy';
import { useNavigateBack } from '@/hooks/use-navigate-back';
import { authClient } from '@/lib/auth/client';
import { passwordInputDisableSuggestions } from '@/lib/auth/password-input';
import { getDefaultAuthenticatedPath } from '@/lib/auth/post-login-path';
import { isRememberLoginEnabled, readRememberedEmail } from '@/lib/auth/storage';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { rememberListingLocation } from '@/lib/listing-form-defaults';
import {
  listRealEstateLocationsPublic,
  type RealEstateCityDto,
} from '@/lib/real-estate-locations-client';
import { paths } from '@/paths';
import { productButtonSx, productSurfacePaperSx } from '@/styles/product-sx';

const signInSchema = zod.object({
  email: zod.string().min(1, { message: 'Emaili është i detyrueshëm' }).email('Email i pavlefshëm'),
  password: zod.string().min(6, { message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere' }),
});

type SignInValues = zod.infer<typeof signInSchema>;

const acceptTermsMessage = 'Duhet të pranoni kushtet e përdorimit';

const individualRegisterSchema = zod
  .object({
    firstName: zod.string().min(1, { message: 'Emri është i detyrueshëm' }),
    lastName: zod.string().min(1, { message: 'Mbiemri është i detyrueshëm' }),
    phone: zod.string().max(40, { message: 'Numri i telefonit është shumë i gjatë' }),
    basedCityId: zod.string(),
    email: zod.string().min(1, { message: 'Emaili është i detyrueshëm' }).email('Email i pavlefshëm'),
    password: zod.string().min(6, { message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere' }),
    confirmPassword: zod.string().min(1, { message: 'Konfirmo fjalëkalimin' }),
    acceptTerms: zod.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Fjalëkalimet nuk përputhen',
    path: ['confirmPassword'],
  })
  .refine((data) => data.acceptTerms, {
    message: acceptTermsMessage,
    path: ['acceptTerms'],
  });

const businessRegisterSchema = zod
  .object({
    nipt: zod.string().min(1, { message: 'NIPT është i detyrueshëm' }),
    businessName: zod.string().min(1, { message: 'Emri i biznesit është i detyrueshëm' }),
    businessOwner: zod.string().min(1, { message: 'Pronari i biznesit është i detyrueshëm' }),
    businessCategory: zod.string().min(1, { message: 'Kategoria është e detyrueshme' }),
    phone: zod.string().max(40, { message: 'Numri i telefonit është shumë i gjatë' }),
    basedCityId: zod.string(),
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
  color: error ? 'error.main' : 'text.primary',
  fontSize: '0.75rem',
});

const outlinedFieldSx = {
  borderRadius: 2.5,
  bgcolor: 'background.default',
  transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
  '&.Mui-focused': {
    boxShadow: `0 0 0 3px ${primaryMainAlpha(0.12)}`,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
  },
  '& input::placeholder': { color: 'text.disabled', opacity: 1 },
};

function BasedCityRegisterField<T extends { basedCityId: string }>({
  control,
  error,
  cities,
  citiesLoading,
}: {
  control: Control<T>;
  error?: string;
  cities: RealEstateCityDto[];
  citiesLoading: boolean;
}) {
  return (
    <Controller
      control={control}
      name={'basedCityId' as never}
      render={({ field }) => (
        <SearchableSelect
          label="Ku jeni bazuar (opsional)"
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={field.onChange}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni qytetin…"
          clearable
          disabled={citiesLoading || cities.length === 0}
          error={Boolean(error)}
          helperText={error}
        />
      )}
    />
  );
}

function IndividualAcceptTermsField({
  control,
  error,
}: {
  control: Control<IndividualRegisterValues>;
  error?: string;
}) {
  return (
    <Controller
      control={control}
      name="acceptTerms"
      render={({ field: { ref, onChange, onBlur, value, name } }) => (
        <FormControl error={Boolean(error)} sx={{ width: '100%' }}>
          <FormControlLabel
            control={
              <Checkbox
                name={name}
                checked={value === true}
                onChange={(event) => onChange(event.target.checked)}
                onBlur={onBlur}
                slotProps={{ input: { ref, id: 'register-individual-accept-terms' } }}
                disableRipple
                sx={{
                  color: 'text.disabled',
                  alignSelf: 'flex-start',
                  py: 0.75,
                  mt: -0.25,
                  '&.Mui-checked': { color: 'primary.main' },
                }}
              />
            }
            label={
              <Typography
                component="span"
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                }}
              >
                Pranoj{' '}
                <MuiLink
                  component={RouterLink}
                  href={paths.public.terms}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'primary.main', fontWeight: 700 }}
                  onMouseDown={(event) => event.preventDefault()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  kushtet e përdorimit
                </MuiLink>{' '}
                dhe{' '}
                <MuiLink
                  component={RouterLink}
                  href={paths.public.privacy}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'primary.main', fontWeight: 700 }}
                  onMouseDown={(event) => event.preventDefault()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  politikën e privatësisë
                </MuiLink>
                .
              </Typography>
            }
            sx={{
              alignItems: 'flex-start',
              mx: 0,
              width: '100%',
              gap: 0.5,
              '& .MuiFormControlLabel-label': { flex: 1 },
            }}
          />
          {error ? <FormHelperText>{error}</FormHelperText> : null}
        </FormControl>
      )}
    />
  );
}

function BusinessAcceptTermsField({
  checked,
  onCheckedChange,
  error,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
}) {
  const checkboxId = 'register-business-accept-terms';

  return (
    <FormControl error={Boolean(error)} sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <Checkbox
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          slotProps={{ input: { id: checkboxId } }}
          disableRipple
          sx={{
            color: 'text.disabled',
            alignSelf: 'flex-start',
            py: 0.75,
            mt: -0.25,
            ml: -0.75,
            '&.Mui-checked': { color: 'primary.main' },
          }}
        />
        <Typography
          component="label"
          htmlFor={checkboxId}
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            flex: 1,
            pt: 1.25,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          Pranoj{' '}
          <MuiLink
            component={RouterLink}
            href={paths.public.terms}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main', fontWeight: 700 }}
            onMouseDown={(event) => event.preventDefault()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            kushtet e përdorimit
          </MuiLink>{' '}
          dhe{' '}
          <MuiLink
            component={RouterLink}
            href={paths.public.privacy}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main', fontWeight: 700 }}
            onMouseDown={(event) => event.preventDefault()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            politikën e privatësisë
          </MuiLink>
          .
        </Typography>
      </Box>
      {error ? <FormHelperText>{error}</FormHelperText> : null}
    </FormControl>
  );
}

function SignInFields({
  control,
  errors,
  showPassword,
  setShowPassword,
  rememberLogin,
  setRememberLogin,
}: {
  control: ReturnType<typeof useForm<SignInValues>>['control'];
  errors: ReturnType<typeof useForm<SignInValues>>['formState']['errors'];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  rememberLogin: boolean;
  setRememberLogin: (v: boolean) => void;
}) {
  const t = useCopy();
  return (
    <Stack spacing={2.25}>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormControl error={Boolean(errors.email)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.email))}>
              {t.auth.email}
            </Typography>
            <OutlinedInput
              {...field}
              id="signin-email"
              placeholder="ju@shembull.com"
              type="email"
              autoComplete="off"
              sx={outlinedFieldSx}
            />
            {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Stack spacing={0.75}>
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <FormControl error={Boolean(errors.password)} fullWidth>
              <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.password))}>
                {t.auth.password}
              </Typography>
              <OutlinedInput
                {...field}
                id="signin-password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                sx={outlinedFieldSx}
                {...passwordInputDisableSuggestions}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                      edge="end"
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ color: 'text.secondary' }}
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            minHeight: 32,
          }}
        >
          <FormControlLabel
            sx={{
              mx: 0,
              mr: 'auto',
              alignItems: 'center',
              '& .MuiFormControlLabel-label': {
                color: 'text.secondary',
                fontSize: '0.875rem',
                fontWeight: 600,
              },
            }}
            control={
              <Checkbox
                checked={rememberLogin}
                onChange={(event) => setRememberLogin(event.target.checked)}
                sx={{ py: 0.25, mt: -0.25 }}
              />
            }
            label={t.auth.rememberLogin}
          />
          <MuiLink
            component={RouterLink}
            href={paths.user.resetPassword}
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.875rem',
              flexShrink: 0,
              textAlign: 'right',
              lineHeight: 1.3,
            }}
          >
            {t.auth.forgotPassword}
          </MuiLink>
        </Box>
      </Stack>
    </Stack>
  );
}

function RegisterFieldsIndividual({
  control,
  errors,
  showPassword,
  setShowPassword,
  cities,
  citiesLoading,
}: {
  control: ReturnType<typeof useForm<IndividualRegisterValues>>['control'];
  errors: ReturnType<typeof useForm<IndividualRegisterValues>>['formState']['errors'];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  cities: RealEstateCityDto[];
  citiesLoading: boolean;
}) {
  const t = useCopy();
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
                {t.auth.firstName}
              </Typography>
              <OutlinedInput {...field} autoComplete="given-name" placeholder={t.auth.firstName} sx={outlinedFieldSx} />
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
                {t.auth.lastName}
              </Typography>
              <OutlinedInput {...field} autoComplete="family-name" placeholder={t.auth.lastName} sx={outlinedFieldSx} />
              {errors.lastName ? <FormHelperText>{errors.lastName.message}</FormHelperText> : null}
            </FormControl>
          )}
        />
      </Box>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <FormControl error={Boolean(errors.phone)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.phone))}>
              Numri i telefonit{' '}
              <Typography component="span" variant="caption" sx={{ fontWeight: 400, opacity: 0.75 }}>
                (opsional)
              </Typography>
            </Typography>
            <OutlinedInput
              {...field}
              autoComplete="tel"
              placeholder="+355 69 …"
              type="tel"
              sx={outlinedFieldSx}
            />
            {errors.phone ? <FormHelperText>{errors.phone.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <BasedCityRegisterField
        control={control}
        error={errors.basedCityId?.message}
        cities={cities}
        citiesLoading={citiesLoading}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormControl error={Boolean(errors.email)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.email))}>
              {t.auth.email}
            </Typography>
            <OutlinedInput {...field} autoComplete="off" placeholder="ju@shembull.com" type="email" sx={outlinedFieldSx} />
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
              {t.auth.password}
            </Typography>
            <OutlinedInput
              {...field}
              {...passwordInputDisableSuggestions}
              placeholder="Të paktën 6 karaktere"
              type={showPassword ? 'text' : 'password'}
              sx={outlinedFieldSx}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                    edge="end"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ color: 'text.secondary' }}
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
              {t.auth.confirmPassword}
            </Typography>
            <OutlinedInput
              {...field}
              {...passwordInputDisableSuggestions}
              placeholder={t.auth.confirmPassword}
              type={showPassword ? 'text' : 'password'}
              sx={outlinedFieldSx}
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
  cities,
  citiesLoading,
}: {
  control: ReturnType<typeof useForm<BusinessRegisterValues>>['control'];
  errors: ReturnType<typeof useForm<BusinessRegisterValues>>['formState']['errors'];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  cities: RealEstateCityDto[];
  citiesLoading: boolean;
}) {
  const t = useCopy();
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
            <OutlinedInput {...field} placeholder="Numri i identifikimit të biznesit" sx={outlinedFieldSx} />
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
            <OutlinedInput {...field} placeholder="Emri i kompanisë ose aktivitetit" sx={outlinedFieldSx} />
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
            <OutlinedInput {...field} placeholder="Emri i plotë i përfaqësuesit" sx={outlinedFieldSx} />
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
            <OutlinedInput {...field} placeholder="p.sh. Restorant, Shërbime, Retail…" sx={outlinedFieldSx} />
            {errors.businessCategory ? <FormHelperText>{errors.businessCategory.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <FormControl error={Boolean(errors.phone)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.phone))}>
              Numri i telefonit{' '}
              <Typography component="span" variant="caption" sx={{ fontWeight: 400, opacity: 0.75 }}>
                (opsional)
              </Typography>
            </Typography>
            <OutlinedInput {...field} autoComplete="tel" placeholder="+355 69 …" type="tel" sx={outlinedFieldSx} />
            {errors.phone ? <FormHelperText>{errors.phone.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
      <BasedCityRegisterField
        control={control}
        error={errors.basedCityId?.message}
        cities={cities}
        citiesLoading={citiesLoading}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormControl error={Boolean(errors.email)} fullWidth>
            <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.email))}>
              {t.auth.email}
            </Typography>
            <OutlinedInput {...field} autoComplete="off" placeholder="ju@biznesi.com" type="email" sx={outlinedFieldSx} />
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
              {t.auth.password}
            </Typography>
            <OutlinedInput
              {...field}
              {...passwordInputDisableSuggestions}
              placeholder="Të paktën 6 karaktere"
              type={showPassword ? 'text' : 'password'}
              sx={outlinedFieldSx}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                    edge="end"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ color: 'text.secondary' }}
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
              {t.auth.confirmPassword}
            </Typography>
            <OutlinedInput
              {...field}
              {...passwordInputDisableSuggestions}
              placeholder={t.auth.confirmPassword}
              type={showPassword ? 'text' : 'password'}
              sx={outlinedFieldSx}
            />
            {errors.confirmPassword ? <FormHelperText>{errors.confirmPassword.message}</FormHelperText> : null}
          </FormControl>
        )}
      />
    </Stack>
  );
}

export function UserAuthView() {
  const searchParams = useSearchParams();
  const t = useCopy();
  const refFromUrl = (searchParams.get('ref') ?? '').trim().toUpperCase();
  const typeFromUrl = (searchParams.get('type') ?? '').trim().toLowerCase();
  const [tab, setTab] = React.useState(refFromUrl || typeFromUrl === 'business' ? 1 : 0);
  const [registerKind, setRegisterKind] = React.useState<'individual' | 'business'>(
    typeFromUrl === 'business' ? 'business' : 'individual',
  );
  const [showPwSignIn, setShowPwSignIn] = React.useState(false);
  const [showPwReg, setShowPwReg] = React.useState(false);
  const [rememberLogin, setRememberLogin] = React.useState(true);
  const [referralCode, setReferralCode] = React.useState(refFromUrl);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [citiesLoading, setCitiesLoading] = React.useState(false);
  const [businessAcceptTerms, setBusinessAcceptTerms] = React.useState(false);
  const [businessAcceptTermsError, setBusinessAcceptTermsError] = React.useState<string | undefined>();
  const [pendingEmail, setPendingEmail] = React.useState('');
  const [resendBusy, setResendBusy] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (refFromUrl) {
      setReferralCode(refFromUrl);
      setTab(1);
    }
  }, [refFromUrl]);

  React.useEffect(() => {
    if (typeFromUrl === 'business') {
      setRegisterKind('business');
      setTab(1);
    }
  }, [typeFromUrl]);

  React.useEffect(() => {
    let cancelled = false;
    setCitiesLoading(true);
    void listRealEstateLocationsPublic().then((res) => {
      if (cancelled) return;
      setCitiesLoading(false);
      if (res.cities) setCities(res.cities);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  React.useEffect(() => {
    setRememberLogin(isRememberLoginEnabled());
    const savedEmail = readRememberedEmail();
    if (savedEmail) signInForm.setValue('email', savedEmail);
  }, [signInForm]);

  const individualForm = useForm<IndividualRegisterValues>({
    resolver: zodResolver(individualRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      basedCityId: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const businessForm = useForm<BusinessRegisterValues>({
    resolver: zodResolver(businessRegisterSchema),
    defaultValues: {
      nipt: '',
      businessName: '',
      businessOwner: '',
      businessCategory: '',
      phone: '',
      basedCityId: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (registerKind === 'business') return;
    setBusinessAcceptTerms(false);
    setBusinessAcceptTermsError(undefined);
  }, [registerKind]);

  const onSignIn = signInForm.handleSubmit(async (values) => {
    signInForm.clearErrors('root');
    const { error, user, code } = await authClient.signIn({ ...values, remember: rememberLogin });
    if (code === 'EMAIL_NOT_CONFIRMED') {
      setPendingEmail(values.email);
      return;
    }
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
    const { error, user, needsEmailConfirmation, email } = await authClient.register({
      userType: 'individual',
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      phone: values.phone.trim() || undefined,
      basedCityId: values.basedCityId.trim() || undefined,
      referralCode: referralCode.trim() || undefined,
    });
    if (error) {
      individualForm.setError('root', { type: 'server', message: error });
      return;
    }
    if (values.basedCityId.trim()) {
      rememberListingLocation(
        {
          cityId: values.basedCityId.trim(),
          cityName:
            (typeof user?.basedCityName === 'string' && user.basedCityName.trim()) ||
            cities.find((c) => c.id === values.basedCityId)?.name ||
            '',
        },
        user?.id,
      );
    }
    if (needsEmailConfirmation) {
      setPendingEmail(email || values.email);
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
    if (!businessAcceptTerms) {
      setBusinessAcceptTermsError(acceptTermsMessage);
      return;
    }
    setBusinessAcceptTermsError(undefined);
    const { error, user, needsEmailConfirmation, email } = await authClient.register({
      userType: 'business',
      nipt: values.nipt,
      businessName: values.businessName,
      businessOwner: values.businessOwner,
      businessCategory: values.businessCategory,
      email: values.email,
      password: values.password,
      phone: values.phone.trim() || undefined,
      basedCityId: values.basedCityId.trim() || undefined,
      referralCode: referralCode.trim() || undefined,
    });
    if (error) {
      businessForm.setError('root', { type: 'server', message: error });
      return;
    }
    if (values.basedCityId.trim()) {
      rememberListingLocation(
        {
          cityId: values.basedCityId.trim(),
          cityName:
            (typeof user?.basedCityName === 'string' && user.basedCityName.trim()) ||
            cities.find((c) => c.id === values.basedCityId)?.name ||
            '',
        },
        user?.id,
      );
    }
    if (needsEmailConfirmation) {
      setPendingEmail(email || values.email);
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

  const handleBack = useNavigateBack(paths.home);

  const onResendConfirmation = async () => {
    if (!pendingEmail || resendBusy) return;
    setResendBusy(true);
    setResendMessage(null);
    try {
      const { error, message } = await authClient.resendConfirmation(pendingEmail);
      if (error) setResendMessage(error);
      else setResendMessage(message || t.auth.resendSent);
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(118, 186, 27, 0.18), transparent 70%)'
            : 'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(118, 186, 27, 0.14), transparent 70%)',
        py: { xs: 3, md: 5 },
        px: 2,
      }}
    >
      <Container maxWidth={false} disableGutters sx={{ width: '100%', maxWidth: 480 }}>
        <Button
          type="button"
          onClick={handleBack}
          aria-label={t.auth.backAria}
          startIcon={<ArrowLeftIcon size={18} weight="bold" />}
          sx={{
            display: 'inline-flex',
            textTransform: 'none',
            fontWeight: 700,
            color: 'text.secondary',
            px: 0.75,
            ml: -0.75,
            mb: 1.5,
            minHeight: 36,
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          {t.auth.back}
        </Button>
        <Card elevation={0} sx={(theme) => ({ ...productSurfacePaperSx(theme), overflow: 'visible' })}>
          <CardContent sx={{ p: { xs: 3, sm: 3.5 } }}>
            <Stack spacing={2.5}>
              <Box>
                <BrandLogo
                  height={36}
                  showWordmark
                  wordmarkPresentation="brand"
                  wordmarkSx={{ fontSize: '1.15rem' }}
                  sx={{ mb: 2 }}
                />
                <Typography
                  variant="h4"
                  sx={{ color: 'text.primary', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}
                >
                  {pendingEmail ? t.auth.checkEmailTitle : 'Mirë se vini'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.55, maxWidth: 420 }}>
                  {pendingEmail
                    ? t.auth.checkEmailBody(pendingEmail)
                    : 'Hyni në llogarinë tuaj ose krijoni një të re në pak hapa — e thjeshtë dhe e shpejtë.'}
                </Typography>
              </Box>

              {pendingEmail ? (
                <Stack spacing={1.5}>
                  {resendMessage ? (
                    <Alert severity="info">{resendMessage}</Alert>
                  ) : null}
                  <Button
                    type="button"
                    variant="contained"
                    disabled={resendBusy}
                    onClick={() => void onResendConfirmation()}
                    sx={{ ...productButtonSx, py: 1.5 }}
                  >
                    {resendBusy ? t.auth.submitting : t.auth.resendConfirmation}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setPendingEmail('');
                      setResendMessage(null);
                      setTab(0);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {t.auth.backToLogin}
                  </Button>
                </Stack>
              ) : (
                <>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{
                  minHeight: 44,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    color: 'text.secondary',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                  },
                  '& .Mui-selected': { color: 'primary.main !important' },
                  '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3, borderRadius: 1 },
                }}
              >
                <Tab label={t.auth.login} disableRipple />
                <Tab label={t.auth.register} disableRipple />
              </Tabs>

              {tab === 0 ? (
                <Box component="form" onSubmit={onSignIn} noValidate autoComplete="off">
                  <Stack spacing={2.5}>
                    <SignInFields
                      control={signInForm.control}
                      errors={signInForm.formState.errors}
                      showPassword={showPwSignIn}
                      setShowPassword={setShowPwSignIn}
                      rememberLogin={rememberLogin}
                      setRememberLogin={setRememberLogin}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={signInForm.formState.isSubmitting}
                      fullWidth
                      sx={{ ...productButtonSx, py: 1.5, minHeight: 48 }}
                    >
                      {signInForm.formState.isSubmitting ? t.auth.signingIn : t.auth.continueToPanel}
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}
                  >
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
                        border: '1px solid !important',
                        borderColor: 'divider !important',
                        borderRadius: '12px !important',
                        color: 'text.primary',
                        textTransform: 'none',
                        fontWeight: 700,
                        py: 1.25,
                        '&.Mui-selected': {
                          bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
                          borderColor: 'primary.main !important',
                          color: 'primary.main',
                        },
                      },
                    }}
                  >
                    <ToggleButton value="individual">
                      <UserIcon style={{ marginRight: 8 }} size={20} />
                      {t.auth.individual}
                    </ToggleButton>
                    <ToggleButton value="business">
                      <BuildingsIcon style={{ marginRight: 8 }} size={20} />
                      {t.auth.business}
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Typography component="label" variant="caption" sx={fieldLabelSx(false)}>
                      Kodi i referimit (opsional)
                    </Typography>
                    <OutlinedInput
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="P.sh. A1B2C3D4"
                      sx={outlinedFieldSx}
                    />
                    {refFromUrl ? (
                      <FormHelperText sx={{ color: 'primary.main' }}>
                        U aplikua automatikisht nga linku i ftesës.
                      </FormHelperText>
                    ) : null}
                  </FormControl>

                  {registerKind === 'individual' ? (
                    <Box component="form" key="register-individual-form" onSubmit={onRegisterIndividual} noValidate autoComplete="off">
                      <Stack spacing={2.5}>
                        <RegisterFieldsIndividual
                          control={individualForm.control}
                          errors={individualForm.formState.errors}
                          showPassword={showPwReg}
                          setShowPassword={setShowPwReg}
                          cities={cities}
                          citiesLoading={citiesLoading}
                        />
                        <IndividualAcceptTermsField
                          control={individualForm.control}
                          error={individualForm.formState.errors.acceptTerms?.message}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={individualForm.formState.isSubmitting}
                          fullWidth
                          sx={{ ...productButtonSx, py: 1.5, minHeight: 48 }}
                        >
                          {individualForm.formState.isSubmitting ? t.auth.creatingAccount : t.auth.submitRegister}
                        </Button>
                      </Stack>
                    </Box>
                  ) : (
                    <Box component="form" key="register-business-form" onSubmit={onRegisterBusiness} noValidate autoComplete="off">
                      <Stack spacing={2.5}>
                        <RegisterFieldsBusiness
                          control={businessForm.control}
                          errors={businessForm.formState.errors}
                          showPassword={showPwReg}
                          setShowPassword={setShowPwReg}
                          cities={cities}
                          citiesLoading={citiesLoading}
                        />
                        <BusinessAcceptTermsField
                          checked={businessAcceptTerms}
                          onCheckedChange={(next) => {
                            setBusinessAcceptTerms(next);
                            if (next) setBusinessAcceptTermsError(undefined);
                          }}
                          error={businessAcceptTermsError}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={businessForm.formState.isSubmitting}
                          fullWidth
                          sx={{ ...productButtonSx, py: 1.5, minHeight: 48 }}
                        >
                          {businessForm.formState.isSubmitting
                            ? t.auth.creatingAccount
                            : t.auth.createBusinessAccount}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Box>
              )}

              {tab === 0 && signInRoot ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,80,80,0.12)' : 'error.lighter',
                    border: '1px solid',
                    borderColor: 'error.main',
                  }}
                >
                  <Typography variant="body2" color="error.main">
                    {signInRoot.message}
                  </Typography>
                </Box>
              ) : null}
              {tab === 1 && registerKind === 'individual' && indRoot ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,80,80,0.12)' : 'error.lighter',
                    border: '1px solid',
                    borderColor: 'error.main',
                  }}
                >
                  <Typography variant="body2" color="error.main">
                    {indRoot.message}
                  </Typography>
                </Box>
              ) : null}
              {tab === 1 && registerKind === 'business' && busRoot ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,80,80,0.12)' : 'error.lighter',
                    border: '1px solid',
                    borderColor: 'error.main',
                  }}
                >
                  <Typography variant="body2" color="error.main">
                    {busRoot.message}
                  </Typography>
                </Box>
              ) : null}
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
