export const BUSINESS_CATEGORY_OPTIONS = [
  { value: 'restorant', label: 'Restorant' },
  { value: 'bar', label: 'Bar & pub' },
  { value: 'kafe', label: 'Kafene' },
  { value: 'brunch', label: 'Brunch & mëngjes' },
  { value: 'piceri-fast-food', label: 'Piceri & fast food' },
  { value: 'pasticeri', label: 'Pastiçeri & ëmbëlsira' },
] as const;

export const BUSINESS_DAY_LABELS = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'] as const;

export const DEFAULT_RESERVATION_TIME_SLOTS = [
  '12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];

export const DEFAULT_RESERVATION_PARTY_SIZES = [1, 2, 3, 4, 5, 6, 8, 10];

export type WeeklyHourRow = {
  dayOfWeek: number;
  closed: boolean;
  open: string;
  close: string;
};

export function defaultWeeklyHours(): WeeklyHourRow[] {
  return BUSINESS_DAY_LABELS.map((_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 6,
    open: '09:00',
    close: '22:00',
  }));
}
