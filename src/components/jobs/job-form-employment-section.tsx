'use client';

import * as React from 'react';
import {
  Box,
  ButtonBase,
  Collapse,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';

import { SearchableSelect } from '@/components/core/searchable-select';
import { findOptionLabel } from '@/components/public/listing-cards/format-helpers';
import { JOB_TYPE_OPTIONS, WORK_LOCATION_OPTIONS } from '@/lib/job-constants';
import { portalToggleGroupSx } from '@/components/user/portal-cards';
import { productPanelSx } from '@/styles/product-sx';

const WORK_LOCATION_TOGGLE_OPTIONS = [
  { value: 'onsite', title: 'Onsite', hint: 'Në zyrë' },
  { value: 'hybrid', title: 'Hybrid', hint: 'Hibrid' },
  { value: 'remote', title: 'Remote', hint: 'Nga shtëpia' },
] as const;

export type JobFormEmploymentValue = {
  jobType: string;
  workLocation: string;
};

function employmentSummary(value: JobFormEmploymentValue): string | null {
  const parts = [
    findOptionLabel(JOB_TYPE_OPTIONS, value.jobType),
    findOptionLabel(WORK_LOCATION_OPTIONS, value.workLocation),
  ].filter((part) => part && part !== '—');
  return parts.length ? parts.join(' · ') : null;
}

function JobWorkLocationToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
        Vendi i punës
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value || null}
        disabled={disabled}
        onChange={(_event, next: string | null) => {
          if (next) onChange(next);
        }}
        aria-label="Vendi i punës"
        sx={[
          portalToggleGroupSx,
          {
            width: '100%',
            '& .MuiToggleButtonGroup-grouped': {
              flex: 1,
              minHeight: 52,
              px: 0.75,
              py: 0.65,
              textTransform: 'none',
              WebkitTapHighlightColor: 'transparent',
              '&:not(.Mui-selected):hover': {
                bgcolor: 'transparent',
                color: 'text.primary',
              },
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                '& .work-location-hint': { opacity: 0.92 },
              },
            },
          },
        ]}
      >
        {WORK_LOCATION_TOGGLE_OPTIONS.map((option) => (
          <ToggleButton key={option.value} value={option.value} aria-label={`${option.title} (${option.hint})`}>
            <Stack spacing={0.1} sx={{ alignItems: 'center', maxWidth: '100%' }}>
              <Typography
                component="span"
                sx={{
                  fontWeight: 750,
                  fontSize: '0.8rem',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                }}
              >
                {option.title}
              </Typography>
              <Typography
                component="span"
                className="work-location-hint"
                sx={{
                  fontSize: '0.68rem',
                  lineHeight: 1.1,
                  opacity: 0.78,
                  whiteSpace: 'nowrap',
                }}
              >
                ({option.hint})
              </Typography>
            </Stack>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

export function JobFormEmploymentSection({
  value,
  onChange,
  defaultOpen = false,
  disabled = false,
}: {
  value: JobFormEmploymentValue;
  onChange: (next: JobFormEmploymentValue) => void;
  defaultOpen?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const summary = employmentSummary(value);

  return (
    <Box sx={{ ...productPanelSx, p: 0, width: '100%', overflow: 'hidden' }}>
      <ButtonBase
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        disabled={disabled}
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 2,
          py: 1.35,
          textAlign: 'left',
          color: 'text.primary',
        }}
      >
        <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.01em' }}>
            Kushtet e punës (opsionale)
          </Typography>
          {!open && summary ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {summary}
            </Typography>
          ) : null}
        </Stack>
        <Box
          sx={{
            display: 'inline-flex',
            flexShrink: 0,
            color: 'text.secondary',
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <CaretDownIcon size={16} weight="bold" />
        </Box>
      </ButtonBase>

      <Collapse in={open} unmountOnExit>
        <Stack spacing={1.75} sx={{ px: 2, pb: 2, pt: 0.25 }}>
          <SearchableSelect
            label="Lloji i kontratës"
            value={value.jobType}
            onChange={(jobType) => onChange({ ...value, jobType })}
            options={JOB_TYPE_OPTIONS}
            emptyLabel="Zgjidhni llojin…"
            clearable
            disabled={disabled}
          />
          <JobWorkLocationToggle
            value={value.workLocation}
            onChange={(workLocation) => onChange({ ...value, workLocation })}
            disabled={disabled}
          />
        </Stack>
      </Collapse>
    </Box>
  );
}
