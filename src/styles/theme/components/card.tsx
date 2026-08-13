import { paperClasses } from '@mui/material';
import type { Components } from '@mui/material/styles';

import { MOTION } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiCard = {
  styleOverrides: {
    root: ({ theme }) => {
      return {
        borderRadius: '20px',
        transition: `box-shadow ${MOTION.base} ${MOTION.ease}, border-color ${MOTION.base} ${MOTION.ease}, transform ${MOTION.base} ${MOTION.ease}`,
        [`&.${paperClasses.elevation1}`]: {
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 5px 22px 0 rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.12)'
              : '0 5px 22px 0 rgba(20, 26, 17, 0.06), 0 0 0 1px rgba(95, 152, 22, 0.22)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      };
    },
  },
} satisfies Components<Theme>['MuiCard'];
