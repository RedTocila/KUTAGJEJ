'use client';

import * as React from 'react';
import { Button, IconButton, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { ListingTextField } from '@/components/user/listing-form-ui';
import { productButtonSx } from '@/styles/product-sx';

export function JobFormStringList({
  label,
  hint,
  items,
  onChange,
  minItems = 1,
  maxItems = 8,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  minItems?: number;
  maxItems?: number;
}) {
  const updateAt = (index: number, value: string) => {
    onChange(items.map((line, i) => (i === index ? value : line)));
  };

  const addLine = () => {
    if (items.length >= maxItems) return;
    onChange([...items, '']);
  };

  const removeAt = (index: number) => {
    if (items.length <= minItems) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={1.75}>
      <Stack spacing={0.25}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.01em' }}>
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </Stack>
      {items.map((line, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <ListingTextField
            value={line}
            onChange={(e) => updateAt(index, e.target.value)}
            fullWidth
            label={`Pika ${index + 1}`}
            placeholder="p.sh. …"
          />
          <IconButton
            aria-label="Hiq pikën"
            onClick={() => removeAt(index)}
            disabled={items.length <= minItems}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              color: 'text.secondary',
              '&:hover': { color: 'error.main', bgcolor: 'action.hover' },
            }}
          >
            <TrashIcon size={18} />
          </IconButton>
        </Stack>
      ))}
      <Button
        type="button"
        variant="outlined"
        startIcon={<PlusIcon size={16} weight="bold" />}
        onClick={addLine}
        disabled={items.length >= maxItems}
        sx={{
          ...productButtonSx,
          alignSelf: 'flex-start',
          minHeight: 48,
          px: 2,
          borderColor: 'divider',
        }}
      >
        Shto pikë
      </Button>
    </Stack>
  );
}
