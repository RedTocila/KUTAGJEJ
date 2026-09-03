'use client';

import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { eachDayOfInterval, format, startOfDay, subDays } from 'date-fns';
import { enGB, sq as sqLocale } from 'date-fns/locale';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { portalToggleGroupSx } from '@/components/user/portal-cards';
import { formatBc } from '@/components/user/packages/package-ui';
import type { AiUsageEvent, AiUsageKind } from '@/lib/ai-import-client';
import type { AppMessages } from '@/lib/i18n/messages';

const KINDS: AiUsageKind[] = ['ai_build', 'ai_assist', 'ai_menu'];
const CHART_H = 176;
const PAD = { top: 12, right: 4, bottom: 8, left: 32 };

type Copy = AppMessages['aiUsage'];

type DayPoint = {
  date: Date;
  key: string;
  total: number;
  uses: number;
  byKind: Record<AiUsageKind, number>;
};

function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function emptyByKind(): Record<AiUsageKind, number> {
  return { ai_build: 0, ai_assist: 0, ai_menu: 0 };
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function yTicks(max: number): number[] {
  if (max <= 1) return [0, 0.5, 1];
  if (max <= 2) return [0, 1, 2];
  return [0, max / 2, max];
}

function buildSeries(events: AiUsageEvent[], range: 7 | 30): DayPoint[] {
  const end = startOfDay(new Date());
  const days = eachDayOfInterval({ start: subDays(end, range - 1), end });
  const buckets = new Map<string, DayPoint>();

  for (const date of days) {
    buckets.set(dayKey(date), { date, key: dayKey(date), total: 0, uses: 0, byKind: emptyByKind() });
  }

  for (const event of events) {
    if (event.status === 'refunded') continue;
    const key = dayKey(startOfDay(new Date(event.createdAt)));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const kind = KINDS.includes(event.kind) ? event.kind : 'ai_assist';
    const cost = Number(event.costBc) || 0;
    bucket.byKind[kind] += cost;
    bucket.total += cost;
    bucket.uses += Math.max(1, Math.floor(Number(event.units) || 1));
  }

  return days.map((date) => buckets.get(dayKey(date))!);
}

function kindLabel(copy: Copy, kind: AiUsageKind): string {
  if (kind === 'ai_build') return copy.aiBuild;
  if (kind === 'ai_menu') return copy.aiMenu;
  return copy.aiAssist;
}

export function AiUsageChart({
  events,
  range,
  onRangeChange,
  locale,
  copy,
}: {
  events: AiUsageEvent[];
  range: 7 | 30;
  onRangeChange: (range: 7 | 30) => void;
  locale: string;
  copy: Copy;
}) {
  const theme = useTheme();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(320);
  const [active, setActive] = React.useState(0);

  const dateFnsLocale = locale.startsWith('en') ? enGB : sqLocale;
  const series = React.useMemo(() => buildSeries(events, range), [events, range]);
  const colors: Record<AiUsageKind, string> = {
    ai_build: theme.palette.success.main,
    ai_assist: theme.palette.info.main,
    ai_menu: theme.palette.warning.main,
  };

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const apply = () => setWidth(Math.max(220, Math.round(el.clientWidth)));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const lastUsed = series.reduce((found, day, i) => (day.total > 0 ? i : found), series.length - 1);
    setActive(lastUsed);
  }, [series]);

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const peak = niceMax(Math.max(0, ...series.map((d) => d.total)));
  const yFor = (value: number) => PAD.top + (1 - value / peak) * innerH;
  const band = innerW / Math.max(1, series.length);
  const barW = Math.max(3, band * (range === 7 ? 0.58 : 0.72));
  const ticks = yTicks(peak);
  const point = series[active] ?? series[series.length - 1]!;
  const periodTotal = series.reduce((sum, d) => sum + d.total, 0);
  const periodUses = series.reduce((sum, d) => sum + d.uses, 0);
  const gridColor = theme.palette.divider;
  const axisColor = theme.palette.text.secondary;
  const usedKinds = KINDS.filter((kind) => series.some((d) => d.byKind[kind] > 0));
  const labelEvery = range === 7 ? 1 : 6;

  const indexFromClientX = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || series.length === 0) return 0;
    const x = clientX - rect.left - PAD.left;
    return Math.max(0, Math.min(series.length - 1, Math.floor(x / band)));
  };

  return (
    <Stack spacing={1.6}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.7} sx={{ alignItems: 'baseline' }}>
            <BoostCoinIcon size={18} />
            <Typography sx={{ fontWeight: 900, fontSize: '1.55rem', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {formatBc(periodTotal)}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', color: 'warning.main', lineHeight: 1 }}>
              BC
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.55, fontWeight: 600 }}>
            {copy.usesCount(periodUses)}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={range}
          onChange={(_event, value: 7 | 30 | null) => {
            if (value) onRangeChange(value);
          }}
          aria-label={copy.historyTitle}
          sx={{
            ...portalToggleGroupSx,
            flexShrink: 0,
            '& .MuiToggleButton-root': { minWidth: 44, px: 1.05, fontSize: '0.72rem' },
          }}
        >
          <ToggleButton value={7}>{copy.range7}</ToggleButton>
          <ToggleButton value={30}>{copy.range30}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box
        ref={wrapRef}
        sx={{ position: 'relative', width: '100%', userSelect: 'none', touchAction: 'manipulation', cursor: 'pointer' }}
        onPointerDown={(event) => setActive(indexFromClientX(event.clientX))}
        onPointerMove={(event) => {
          if (event.pointerType === 'mouse' || event.buttons) {
            setActive(indexFromClientX(event.clientX));
          }
        }}
      >
        <svg width="100%" height={CHART_H} viewBox={`0 0 ${width} ${CHART_H}`} role="img" aria-label={copy.historyTitle}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke={gridColor}
                strokeDasharray={tick === 0 ? undefined : '3 5'}
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={yFor(tick) + 3} textAnchor="end" fill={axisColor} fontSize={10} fontWeight={700}>
                {formatBc(tick)}
              </text>
            </g>
          ))}

          {series.map((day, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const selected = i === active;
            let yCursor = yFor(0);

            if (day.total <= 0) {
              return (
                <rect
                  key={day.key}
                  x={x}
                  y={yCursor - 3}
                  width={barW}
                  height={3}
                  rx={1.5}
                  fill={gridColor}
                  opacity={selected ? 1 : 0.7}
                />
              );
            }

            const radius = Math.min(4, barW / 2);
            const segments: { kind: (typeof KINDS)[number]; x: number; y: number; h: number }[] = [];
            for (const kind of KINDS) {
              if (day.byKind[kind] <= 0) continue;
              const h = Math.max(1.5, (day.byKind[kind] / peak) * innerH);
              const y = yCursor - h;
              yCursor = y;
              segments.push({ kind, x, y, h });
            }
            const top = segments[segments.length - 1];

            return (
              <g key={day.key} opacity={selected ? 1 : 0.78}>
                {top ? (
                  <rect
                    x={x}
                    y={top.y}
                    width={barW}
                    height={yFor(0) - top.y}
                    rx={radius}
                    fill={colors[top.kind]}
                  />
                ) : null}
                {segments.slice(0, -1).map((seg) => (
                  <rect key={seg.kind} x={seg.x} y={seg.y} width={barW} height={seg.h} fill={colors[seg.kind]} />
                ))}
              </g>
            );
          })}
        </svg>
      </Box>

      <Box sx={{ position: 'relative', height: 18, pl: `${PAD.left}px`, pr: `${PAD.right}px` }}>
        {series.map((day, i) => {
          const show = range === 7 || i === 0 || i === series.length - 1 || i % labelEvery === 0;
          if (!show) return null;
          const pct = ((PAD.left + i * band + band / 2) / width) * 100;
          return (
            <Typography
              key={day.key}
              variant="caption"
              color={i === active ? 'text.primary' : 'text.secondary'}
              sx={{
                position: 'absolute',
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                fontWeight: i === active ? 800 : 650,
                fontSize: '0.68rem',
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              {format(day.date, range === 7 ? 'd' : 'd MMM', { locale: dateFnsLocale })}
            </Typography>
          );
        })}
      </Box>

      <Box
        sx={{
          px: 1.5,
          py: 1.2,
          borderRadius: 2.25,
          border: 'none',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.7 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
            {format(point.date, 'd MMM', { locale: dateFnsLocale })}
          </Typography>
          <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center' }}>
            <BoostCoinIcon size={13} />
            <Typography sx={{ fontWeight: 850, fontSize: '0.82rem', color: 'warning.main' }}>
              {formatBc(point.total)} BC
            </Typography>
          </Stack>
        </Stack>
        {point.total > 0 ? (
          <Stack spacing={0.5}>
            {KINDS.filter((kind) => point.byKind[kind] > 0).map((kind) => (
              <Stack key={kind} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: colors[kind], flexShrink: 0 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {kindLabel(copy, kind)}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {formatBc(point.byKind[kind])} BC
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {events.length === 0 ? copy.empty : copy.emptyRange}
          </Typography>
        )}
      </Box>

      {usedKinds.length > 0 ? (
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
          {usedKinds.map((kind) => (
            <Stack key={kind} direction="row" spacing={0.7} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: colors[kind] }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
                {kindLabel(copy, kind)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
