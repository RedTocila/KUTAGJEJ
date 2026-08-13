'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { ChatCircle as ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';
import { productButtonSx } from '@/styles/product-sx';

const STEP_ICONS = [SquaresFourIcon, CameraIcon, CheckCircleIcon, ChatCircleIcon] as const;

function StepVisual({ stepIndex }: { stepIndex: number }) {
  const Icon = STEP_ICONS[stepIndex] ?? SquaresFourIcon;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 10',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        backgroundImage:
          'linear-gradient(145deg, rgba(var(--mui-palette-primary-mainChannel) / 0.18) 0%, rgba(var(--mui-palette-primary-mainChannel) / 0.04) 55%, transparent 100%)',
        bgcolor: 'action.hover',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(var(--mui-palette-primary-mainChannel) / 0.18) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          opacity: 0.55,
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '12%',
          right: '10%',
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--mui-palette-primary-mainChannel) / 0.35) 0%, transparent 70%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '8%',
          left: '8%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--mui-palette-primary-mainChannel) / 0.22) 0%, transparent 70%)',
        }}
      />

      <Stack
        spacing={1.25}
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: '0 12px 28px -10px rgba(var(--mui-palette-primary-mainChannel) / 0.65)',
          }}
        >
          <Icon size={34} weight="duotone" />
        </Box>

        {stepIndex === 1 ? (
          <Stack direction="row" spacing={0.75}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 44,
                  height: 34,
                  borderRadius: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  opacity: 0.9 - i * 0.15,
                }}
              />
            ))}
          </Stack>
        ) : null}

        {stepIndex === 3 ? (
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              maxWidth: 200,
            }}
          >
            <Box sx={{ height: 6, width: '72%', borderRadius: 99, bgcolor: 'action.selected', mb: 0.5 }} />
            <Box sx={{ height: 6, width: '48%', borderRadius: 99, bgcolor: 'action.hover' }} />
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

export function HowItWorksTutorial({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useCopy();
  const copy = t.home.howItWorksTutorial;
  const [step, setStep] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);

  const steps = copy.steps;
  const total = steps.length;
  const isLast = step >= total - 1;
  const current = steps[step] ?? steps[0];

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const goNext = () => {
    if (isLast) return;
    setStep((s) => Math.min(total - 1, s + 1));
  };

  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={onClose} subtitle={copy.stepOf(step + 1, total)}>
        {copy.title}
      </ProductDialogTitle>
      <ProductDialogContent sx={{ pt: 0.5 }}>
        <Box
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            const end = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (start == null || end == null) return;
            const delta = end - start;
            if (delta < -48) goNext();
            if (delta > 48) goBack();
          }}
        >
          <StepVisual stepIndex={step} />
          <Typography sx={{ mt: 2.25, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.25 }}>
            {current.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.75, lineHeight: 1.55, fontWeight: 550 }}
          >
            {current.description}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'center', mt: 2.25 }}>
          {steps.map((_, index) => (
            <Box
              key={index}
              component="button"
              type="button"
              aria-label={copy.stepOf(index + 1, total)}
              aria-current={index === step ? 'step' : undefined}
              onClick={() => setStep(index)}
              sx={{
                width: index === step ? 22 : 8,
                height: 8,
                border: 0,
                p: 0,
                borderRadius: 99,
                cursor: 'pointer',
                bgcolor: index === step ? 'primary.main' : 'action.selected',
                transition: 'width 0.2s ease, background-color 0.2s ease',
              }}
            />
          ))}
        </Stack>
      </ProductDialogContent>

      <ProductDialogActions sx={{ justifyContent: 'space-between', gap: 1 }}>
        <IconButton
          aria-label={copy.back}
          onClick={goBack}
          disabled={step === 0}
          size="small"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            visibility: step === 0 ? 'hidden' : 'visible',
          }}
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </IconButton>

        {isLast ? (
          <Button
            component={RouterLink}
            href={paths.user.realEstateListing}
            variant="contained"
            endIcon={<ArrowRightIcon size={16} weight="bold" />}
            onClick={onClose}
            sx={{ ...productButtonSx, flex: 1, py: 1.1 }}
          >
            {copy.done}
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<ArrowRightIcon size={16} weight="bold" />}
            onClick={goNext}
            sx={{ ...productButtonSx, flex: 1, py: 1.1 }}
          >
            {copy.next}
          </Button>
        )}
      </ProductDialogActions>
    </ProductDialog>
  );
}
