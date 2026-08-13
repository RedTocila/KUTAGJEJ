'use client';

import * as React from 'react';
import { IconButton, InputAdornment, Link, Tooltip, Typography } from '@mui/material';
import { Question as QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';

import {
  supportIdentityChangeWhatsappHref,
  type IdentityFieldKind,
} from '@/lib/support-contact';

function IdentityFieldHelpTooltipContent(props: {
  fieldKind: IdentityFieldKind;
  locked: boolean;
  whatsappHref: string | null;
}) {
  const { fieldKind, locked, whatsappHref } = props;
  const fieldName = fieldKind === 'nipt' ? 'NIPT-i' : 'numri i ID-së';

  if (locked) {
    return (
      <Typography variant="body2" component="span" sx={{ display: 'block', lineHeight: 1.45 }}>
        Ky fushë nuk mund të ndryshohet vetë.{' '}
        {whatsappHref ? (
          <Link
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
            sx={{ color: 'primary.main', fontWeight: 700 }}
          >
            Kontaktoni mbështetjen
          </Link>
        ) : (
          'Kontaktoni mbështetjen'
        )}{' '}
        për ta përditësuar.
      </Typography>
    );
  }

  return (
    <Typography variant="body2" component="span" sx={{ display: 'block', lineHeight: 1.45 }}>
      Kontrolloni që {fieldName} të jetë i saktë para dërgimit. Nëse gaboni pas verifikimit,{' '}
      {whatsappHref ? (
        <Link
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          underline="always"
          sx={{ color: 'primary.main', fontWeight: 700 }}
        >
          kontaktoni mbështetjen
        </Link>
      ) : (
        'kontaktoni mbështetjen'
      )}{' '}
      për ta korrigjuar.
    </Typography>
  );
}

export function IdentityFieldHelpAdornment(props: {
  fieldKind: IdentityFieldKind;
  locked?: boolean;
  currentValue?: string;
  userEmail?: string;
}) {
  const { fieldKind, locked = false, currentValue, userEmail } = props;
  const whatsappHref = supportIdentityChangeWhatsappHref(fieldKind, {
    currentValue,
    email: userEmail,
  });

  return (
    <InputAdornment position="end" sx={{ pointerEvents: 'auto', mr: -0.25 }}>
      <Tooltip
        arrow
        enterTouchDelay={0}
        title={
          <IdentityFieldHelpTooltipContent
            fieldKind={fieldKind}
            locked={locked}
            whatsappHref={whatsappHref}
          />
        }
        slotProps={{
          tooltip: {
            sx: { maxWidth: 280, p: 1.25 },
          },
        }}
      >
        <IconButton
          aria-label="Si të ndryshohet kjo fushë"
          edge="end"
          size="small"
          tabIndex={-1}
          sx={{ color: 'text.secondary', mr: -0.5 }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <QuestionIcon size={18} weight="bold" />
        </IconButton>
      </Tooltip>
    </InputAdornment>
  );
}
