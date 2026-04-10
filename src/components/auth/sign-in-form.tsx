'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
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

export function SignInForm() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = React.useCallback(async (values: Values) => {
    try {
      setIsPending(true);
      const { error } = await authClient.signIn(values);
      if (error) { setError('root', { type: 'server', message: error }); return; }
      window.location.href = '/dashboard';
    } catch (error) {
      setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Identifikimi dështoi. Provoni përsëri.',
      });
    } finally {
      setIsPending(false);
    }
  }, [setError]);

  return (
    <>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2.5}>
          <Controller
            control={control}
            name="email"
            render={(props: ControllerRenderArgs<'email'>) => (
            <FormControl error={Boolean(errors.email)} fullWidth>
              <Typography
                variant="caption"
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  color: errors.email ? 'error.main' : 'common.white',
                  fontSize: '0.75rem',
                }}
              >
                Adresa e emailit
              </Typography>
              <OutlinedInput
                {...props.field}
                placeholder="email@domeni.com"
                type="email"
                sx={{
                  color: 'common.white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.35)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.7)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'common.white',
                  },
                  '& input::placeholder': {
                    color: 'rgba(255,255,255,0.6)',
                    opacity: 1,
                  },
                }}
              />
              {errors.email && <FormHelperText>{errors.email.message}</FormHelperText>}
            </FormControl>
          )}
          />
          <Controller
            control={control}
            name="password"
            render={(props: ControllerRenderArgs<'password'>) => (
            <FormControl error={Boolean(errors.password)} fullWidth>
              <Typography
                variant="caption"
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  color: errors.password ? 'error.main' : 'common.white',
                  fontSize: '0.75rem',
                }}
              >
                Fjalëkalimi
              </Typography>
              <OutlinedInput
                {...props.field}
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                sx={{
                  color: 'common.white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.35)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.7)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'common.white',
                  },
                  '& input::placeholder': {
                    color: 'rgba(255,255,255,0.6)',
                    opacity: 1,
                  },
                }}
                endAdornment={
                  <Box
                    sx={{
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.7)',
                      '&:hover': { color: 'common.white' },
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? React.createElement(EyeIcon, { size: 20 }) : React.createElement(EyeSlashIcon, { size: 20 })}
                  </Box>
                }
              />
              {errors.password && <FormHelperText>{errors.password.message}</FormHelperText>}
            </FormControl>
          )}
          />
          <Button
            disabled={isPending}
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            sx={{ py: 1.5, mt: 1, color: 'common.white' }}
          >
            {isPending ? 'Duke u identifikuar…' : 'Hyr në panel'}
          </Button>
        </Stack>
      </Box>

      {errors.root && <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light' }}><Typography variant="body2" color="error.main">{errors.root.message}</Typography></Box>}
    </>
  );
}
