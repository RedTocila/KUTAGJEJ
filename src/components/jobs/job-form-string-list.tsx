'use client';

import * as React from 'react';
import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

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
    <Stack spacing={1.25}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </Stack>
      {items.map((line, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            value={line}
            onChange={(e) => updateAt(index, e.target.value)}
            fullWidth
            multiline
            minRows={1}
            placeholder={`Pika ${index + 1}`}
            size="small"
          />
          <IconButton
            aria-label="Hiq pikën"
            onClick={() => removeAt(index)}
            disabled={items.length <= minItems}
            size="small"
            sx={{ mt: 0.5 }}
          >
            <TrashIcon size={18} />
          </IconButton>
        </Stack>
      ))}
      <Button
        type="button"
        variant="outlined"
        size="small"
        startIcon={<PlusIcon size={16} />}
        onClick={addLine}
        disabled={items.length >= maxItems}
        sx={{ alignSelf: 'flex-start' }}
      >
        Shto pikë
      </Button>
    </Stack>
  );
}
