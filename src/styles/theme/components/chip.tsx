import type { Components } from '@mui/material/styles';

import { MOTION } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiChip = {
  styleOverrides: {
    root: {
      transition: `background-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}`,
      '&:active': {
        transform: 'scale(0.97)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:active': { transform: 'none' },
      },
    },
  },
} satisfies Components<Theme>['MuiChip'];
