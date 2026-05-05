'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Container, Link as MuiLink, Stack, Typography } from '@mui/material';

import { paths } from '@/paths';

export function SeoIntroSection() {
  return (
    <Box component="section" aria-labelledby="about-kutagjej" sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Typography
            id="about-kutagjej"
            component="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              letterSpacing: '-0.01em',
            }}
          >
            Çfarë është KuTaGjej?
          </Typography>
          <Typography component="p" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            <strong>KuTaGjej</strong> është platforma shqiptare e njoftimeve falas. Çdo ditë mijëra përdorues kërkojnë
            dhe postojnë{' '}
            <MuiLink component={RouterLink} href={paths.public.realEstate} underline="hover">
              apartamente me qira dhe shitje
            </MuiLink>
            ,{' '}
            <MuiLink component={RouterLink} href={paths.public.cars} underline="hover">
              vetura të reja dhe të përdorura
            </MuiLink>
            ,{' '}
            <MuiLink component={RouterLink} href={paths.public.jobs} underline="hover">
              vende pune në çdo industri
            </MuiLink>{' '}
            dhe{' '}
            <MuiLink component={RouterLink} href={paths.public.marketplace} underline="hover">
              artikuj të rinj e të dorës së dytë
            </MuiLink>{' '}
            në Tiranë, Durrës, Vlorë, Shkodër dhe gjithë Shqipërinë.
          </Typography>
          <Typography component="p" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Postimi është falas dhe zgjat më pak se një minutë. Shto fotografi, çmim, vendndodhje dhe informacionet
            kryesore — njoftimi yt shfaqet menjëherë në kategorinë përkatëse dhe është i kërkueshëm nga vizitorët.
            Mund të{' '}
            <MuiLink component={RouterLink} href={paths.auth.signIn} underline="hover">
              hysh në llogarinë tënde
            </MuiLink>{' '}
            për të menaxhuar njoftimet ekzistuese ose për të krijuar të reja.
          </Typography>
          <Typography component="p" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Pavarësisht nëse ke nevojë për një{' '}
            <strong>apartament 1+1 me qira në Tiranë</strong>, një{' '}
            <strong>makinë të dorës së dytë</strong> për familjen, një{' '}
            <strong>punë në sektorin IT</strong> apo thjesht dëshiron të{' '}
            <strong>shesësh diçka në treg</strong>, KuTaGjej e bën të lehtë: kërko, krahasoji dhe lidhu drejtpërdrejt
            me shitësin ose punëdhënësin.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
