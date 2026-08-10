'use client';

import * as React from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Typography,
  useTheme,
} from '@mui/material';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import type { Contract } from '@/types/contract';
import { deleteContract } from '@/lib/admin-contracts-client';
import { productButtonSx, productPanelSx } from '@/styles/product-sx';

export function ContractDeleteDialog(props: {
  contract: Contract | null;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const theme = useTheme();
  const { contract, onClose, onDeleted } = props;
  const open = Boolean(contract);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    if (!contract) return;
    setError(null);
    setPending(true);
    try {
      const { error: err } = await deleteContract(contract.id);
      if (err) {
        setError(err);
        return;
      }
      await onDeleted();
    } finally {
      setPending(false);
    }
  };

  return (
    <ProductDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <ProductDialogTitle onClose={onClose}>Fshi paketën?</ProductDialogTitle>
      <ProductDialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 1.5 }}>
            {error}
          </Alert>
        ) : null}
        <Box
          sx={{
            ...productPanelSx,
            p: 2,
            bgcolor: alpha(theme.palette.error.main, 0.06),
            borderColor: alpha(theme.palette.error.main, 0.2),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Paketa{' '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {contract?.title}
            </Box>{' '}
            do të hiqet përgjithmonë. Ky veprim nuk kthehet mbrapsht.
          </Typography>
        </Box>
      </ProductDialogContent>
      <ProductDialogActions>
        <Button onClick={onClose} size="large" sx={productButtonSx}>
          Anulo
        </Button>
        <Button
          color="error"
          variant="contained"
          size="large"
          onClick={() => void confirm()}
          disabled={pending}
          sx={{ ...productButtonSx, minWidth: 100 }}
        >
          {pending ? 'Duke u fshirë…' : 'Fshi'}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}
