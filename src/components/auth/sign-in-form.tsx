'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import type { ControllerFieldState, ControllerRenderProps, UseFormStateReturn } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import { authClient } from '@/lib/auth/client';
import { getDefaultAuthenticatedPath } from '@/lib/auth/post-login-path';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productButtonSx } from '@/styles/product-sx';

const schema = zod.object({
  email: zod.string().min(1, { message: 'Emaili është i detyrueshëm' }).email('Email i pavlefshëm'),
  password: zod.string().min(6, { message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere' }),
});

type Values = zod.infer<typeof schema>;

type ControllerRenderArgs<TName extends 'email' | 'password'> = {
  field: ControllerRenderProps<Values, TName>;
  fieldState: ControllerFieldState;
  formState: UseFormStateReturn<Values>;
};

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

export function SignInForm() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = React.useCallback(
    async (values: Values) => {
      try {
        setIsPending(true);
        const { error, user } = await authClient.signIn(values);
        if (error) {
          setError('root', { type: 'server', message: error });
          return;
        }
        if (!user) {
          setError('root', { type: 'server', message: 'Identifikimi dështoi.' });
          return;
        }
        window.location.href = getDefaultAuthenticatedPath(user);
      } catch (error) {
        setError('root', {
          type: 'server',
          message: error instanceof Error ? error.message : 'Identifikimi dështoi. Provoni përsëri.',
        });
      } finally {
        setIsPending(false);
      }
    },
    [setError],
  );

  return (
    <>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2.5}>
          <Controller
            control={control}
            name="email"
            render={(props: ControllerRenderArgs<'email'>) => (
              <FormControl error={Boolean(errors.email)} fullWidth>
                <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.email))}>
                  Adresa e emailit
                </Typography>
                <OutlinedInput {...props.field} placeholder="Email" type="email" sx={outlinedFieldSx} />
                {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
          <Controller
            control={control}
            name="password"
            render={(props: ControllerRenderArgs<'password'>) => (
              <FormControl error={Boolean(errors.password)} fullWidth>
                <Typography component="label" variant="caption" sx={fieldLabelSx(Boolean(errors.password))}>
                  Fjalëkalimi
                </Typography>
                <OutlinedInput
                  {...props.field}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  sx={outlinedFieldSx}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
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
          <Button
            disabled={isPending}
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            sx={{ ...productButtonSx, py: 1.5, minHeight: 48 }}
          >
            {isPending ? 'Duke u identifikuar…' : 'Hyr në panel'}
          </Button>
        </Stack>
      </Box>

      {errors.root ? (
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,80,80,0.12)' : 'error.lighter',
            border: '1px solid',
            borderColor: 'error.main',
          }}
        >
          <Typography variant="body2" color="error.main">
            {errors.root.message}
          </Typography>
        </Box>
      ) : null}
    </>
  );
}
