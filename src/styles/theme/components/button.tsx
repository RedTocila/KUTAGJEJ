import type { Components } from '@mui/material/styles';

import { MOTION } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiButton = {
  styleOverrides: {
    root: {
      borderRadius: '12px',
      textTransform: 'none',
      transition: `background-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}, opacity ${MOTION.fast} ${MOTION.ease}`,
      '&:active': {
        transform: 'scale(0.98)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:active': { transform: 'none' },
      },
      '&.MuiButton-text.MuiButton-sizeSmall': { padding: '7px 12px' },
      '&.MuiButton-text.MuiButton-sizeMedium': { padding: '9px 16px' },
      '&.MuiButton-text.MuiButton-sizeLarge': { padding: '12px 16px' },
    },
    sizeSmall: { padding: '6px 16px' },
    sizeMedium: { padding: '8px 20px' },
    sizeLarge: { padding: '11px 24px' },
  },
} satisfies Components<Theme>['MuiButton'];
