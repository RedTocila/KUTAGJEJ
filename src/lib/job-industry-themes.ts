import type { JobIndustryValue } from '@/lib/job-constants';

export type JobCoverTheme = {
  background: string;
  colorFrom: string;
  colorMid: string;
  iconColor: string;
};

const DEFAULT_THEME: JobCoverTheme = {
  background: '#1976d2',
  colorFrom: '#0754ae',
  colorMid: '#2386df',
  iconColor: '#fff',
};

/** Stable mockup gradient per industry — same sector always reads the same on cards and forms. */
const JOB_INDUSTRY_THEME_MAP: Record<JobIndustryValue, JobCoverTheme> = {
  'biznes-menaxhim': {
    background: '#1565c0',
    colorFrom: '#0d47a1',
    colorMid: '#1976d2',
    iconColor: '#fff',
  },
  horeka: {
    background: '#e65100',
    colorFrom: '#bf360c',
    colorMid: '#f57c00',
    iconColor: '#fff',
  },
  'instalime-mirembajtje': {
    background: '#00838f',
    colorFrom: '#006064',
    colorMid: '#0097a7',
    iconColor: '#fff',
  },
  ligjore: {
    background: '#4527a0',
    colorFrom: '#311b92',
    colorMid: '#5e35b1',
    iconColor: '#fff',
  },
  'prokurim-logjistike': {
    background: '#6d4c41',
    colorFrom: '#4e342e',
    colorMid: '#8d6e63',
    iconColor: '#fff',
  },
  'shitje-zhvillim': {
    background: '#c62828',
    colorFrom: '#b71c1c',
    colorMid: '#e53935',
    iconColor: '#fff',
  },
  finance: {
    background: '#2e7d32',
    colorFrom: '#1b5e20',
    colorMid: '#388e3c',
    iconColor: '#fff',
  },
  'ndertim-industri': {
    background: '#f9a825',
    colorFrom: '#f57f17',
    colorMid: '#fbc02d',
    iconColor: '#1a1a1a',
  },
  'burime-njerezore': {
    background: '#7b1fa2',
    colorFrom: '#6a1b9a',
    colorMid: '#9c27b0',
    iconColor: '#fff',
  },
  administrim: {
    background: '#546e7a',
    colorFrom: '#37474f',
    colorMid: '#607d8b',
    iconColor: '#fff',
  },
  'teknologji-informacioni': {
    background: '#0277bd',
    colorFrom: '#01579b',
    colorMid: '#0288d1',
    iconColor: '#fff',
  },
  'marketing-produkte': {
    background: '#d81b60',
    colorFrom: '#ad1457',
    colorMid: '#ec407a',
    iconColor: '#fff',
  },
  'art-televizion': {
    background: '#8e24aa',
    colorFrom: '#6a1b9a',
    colorMid: '#ab47bc',
    iconColor: '#fff',
  },
  'sherbim-klienti': {
    background: '#00897b',
    colorFrom: '#00695c',
    colorMid: '#26a69a',
    iconColor: '#fff',
  },
  'mjekesore-shendetesore': {
    background: '#00695c',
    colorFrom: '#004d40',
    colorMid: '#00897b',
    iconColor: '#fff',
  },
  profesioniste: {
    background: '#3949ab',
    colorFrom: '#283593',
    colorMid: '#5c6bc0',
    iconColor: '#fff',
  },
  'siguria-kompjuterike': {
    background: '#283593',
    colorFrom: '#1a237e',
    colorMid: '#3949ab',
    iconColor: '#fff',
  },
  'siguria-teknike': {
    background: '#ef6c00',
    colorFrom: '#e65100',
    colorMid: '#fb8c00',
    iconColor: '#fff',
  },
  security: {
    background: '#424242',
    colorFrom: '#212121',
    colorMid: '#616161',
    iconColor: '#fff',
  },
  prodhim: {
    background: '#455a64',
    colorFrom: '#263238',
    colorMid: '#546e7a',
    iconColor: '#fff',
  },
  'finance-banke': {
    background: '#1b5e20',
    colorFrom: '#0d3d14',
    colorMid: '#2e7d32',
    iconColor: '#fff',
  },
  retail: {
    background: '#ff6f00',
    colorFrom: '#e65100',
    colorMid: '#ff9800',
    iconColor: '#fff',
  },
  mjedisi: {
    background: '#558b2f',
    colorFrom: '#33691e',
    colorMid: '#689f38',
    iconColor: '#fff',
  },
  magazine: {
    background: '#795548',
    colorFrom: '#5d4037',
    colorMid: '#8d6e63',
    iconColor: '#fff',
  },
  teknik: {
    background: '#546e7a',
    colorFrom: '#37474f',
    colorMid: '#78909c',
    iconColor: '#fff',
  },
  pastrim: {
    background: '#039be5',
    colorFrom: '#0277bd',
    colorMid: '#29b6f6',
    iconColor: '#fff',
  },
};

export function jobIndustryCoverTheme(industry?: string | null): JobCoverTheme {
  const key = String(industry ?? '').trim() as JobIndustryValue;
  return JOB_INDUSTRY_THEME_MAP[key] ?? DEFAULT_THEME;
}
