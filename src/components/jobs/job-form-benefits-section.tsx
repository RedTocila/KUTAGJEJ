'use client';

import * as React from 'react';
import {
  Box,
  ButtonBase,
  Checkbox,
  Collapse,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';

import { JOB_BENEFIT_PRESETS } from '@/lib/job-constants';
import { ListingTextField } from '@/components/user/listing-form-ui';
import { productPanelSx } from '@/styles/product-sx';

export type JobFormBenefitsValue = {
  benefitIds: string[];
  customBenefitEnabled: boolean;
  customBenefit: string;
};

export function JobFormBenefitsSection({
  value,
  onChange,
  defaultOpen = false,
}: {
  value: JobFormBenefitsValue;
  onChange: (next: JobFormBenefitsValue) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const selectedCount =
    value.benefitIds.length + (value.customBenefitEnabled && value.customBenefit.trim() ? 1 : 0);

  return (
    <Box sx={{ ...productPanelSx, p: 0, width: '100%', overflow: 'hidden' }}>
      <ButtonBase
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
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
            Përfitimet (opsionale)
          </Typography>
          {!open && selectedCount > 0 ? (
            <Typography variant="caption" color="text.secondary">
              {selectedCount} {selectedCount === 1 ? 'i zgjedhur' : 'të zgjedhura'}
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
        <Stack spacing={1.5} sx={{ px: 2, pb: 2, pt: 0.25 }}>
          <FormGroup>
            {JOB_BENEFIT_PRESETS.map((preset) => (
              <FormControlLabel
                key={preset.id}
                control={
                  <Checkbox
                    checked={value.benefitIds.includes(preset.id)}
                    onChange={(e) => {
                      onChange({
                        ...value,
                        benefitIds: e.target.checked
                          ? [...value.benefitIds, preset.id]
                          : value.benefitIds.filter((id) => id !== preset.id),
                      });
                    }}
                  />
                }
                label={preset.label}
              />
            ))}
          </FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={value.customBenefitEnabled}
                onChange={(e) => onChange({ ...value, customBenefitEnabled: e.target.checked })}
              />
            }
            label="Përfitim tjetër (opsional)"
          />
          {value.customBenefitEnabled ? (
            <ListingTextField
              label="Përfitim tjetër"
              value={value.customBenefit}
              onChange={(e) => onChange({ ...value, customBenefit: e.target.value })}
              fullWidth
              placeholder="p.sh. Ditë pushimi shtesë"
            />
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
}
