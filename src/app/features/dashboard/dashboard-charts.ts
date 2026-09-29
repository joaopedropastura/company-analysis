import type { ScriptableContext, TooltipItem } from 'chart.js';
import { MonthlyPoint, WaterfallStep } from '../../core/finance/finance';
import { brl, brlCompact, MINUS, num, num2dp, pct } from '../../core/format';
import { BarChartConfig, LineChartConfig } from '../../shared/chart/chart';
import {
  alpha,
  barValueLabels,
  categoryLabels,
  ChartTheme,
  crosshair,
  lineEndLabels,
  referenceLine,
  tightGroups,
  tooltipStyle,
} from '../../shared/chart/chart-theme';

export type WaterfallScale = 'per100' | 'reais';

export function waterfallChart(
  steps: readonly WaterfallStep[],
  faturamento: number,
  scale: WaterfallScale,
  t: ChartTheme,
): BarChartConfig {
  const factor = scale === 'per100' && faturamento > 0 ? 100 / faturamento : 1;
  const data = steps.map((s) => [s.start * factor, s.end * factor] as [number, number]);
  const colors = steps.map((s) =>
    s.kind === 'out' ? t.out : s.kind === 'result' ? (s.value >= 0 ? t.result : t.out) : t.context,
  );
  const flat = data.flat();
  const min = Math.min(0, ...flat);
  const max = Math.max(0, ...flat);
  const span = max - min || 1;

  const fmt = (v: number) => (scale === 'per100' ? num2dp(v) : brlCompact(v));
  const text = (i: number) => {
    const v = steps[i].value * factor;
    return steps[i].kind === 'out' ? `${MINUS}${fmt(Math.abs(v))}` : fmt(v);
  };
  const labelRoom = Math.max(...steps.map((_, i) => text(i).length)) * 7.2 + 14;

  return {
    type: 'bar',
    data: {
      labels: steps.map((s) => s.short),
      datasets: [
        {
          label: 'Fluxo do faturamento',
          data,
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => alpha(c, 0.78)),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 22,
          categoryPercentage: 0.86,
          barPercentage: 0.9,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      layout: { padding: { right: labelRoom } },
      scales: {
        x: {
          min: min < 0 ? min - span * 0.04 : 0,
          max,
          grid: { color: (ctx) => (ctx.tick?.value === 0 ? t.ruleStrong : 'transparent'), drawTicks: false },
          border: { display: false },
          ticks: { display: false },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: t.ink2, padding: 10, font: { size: 12.5, weight: 500 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          displayColors: false,
          callbacks: {
            title: (items: TooltipItem<'bar'>[]) => steps[items[0].dataIndex].label,
            label: (item: TooltipItem<'bar'>) => {
              const s = steps[item.dataIndex];
              if (scale === 'per100') {
                const v = Math.abs(s.value * factor);
                return s.kind === 'out' ? `Saem R$\u00a0${num2dp(v)} a cada R$\u00a0100` : `R$\u00a0${num2dp(s.value * factor)} a cada R$\u00a0100`;
              }
              const share = faturamento > 0 ? ` (${pct(Math.abs(s.value) / faturamento)} do faturamento)` : '';
              return `${brl(s.value)}${share}`;
            },
            footer: (items: TooltipItem<'bar'>[]) => steps[items[0].dataIndex].hint,
          },
        },
      },
    },
    plugins: [barValueLabels({ text, color: t.ink, surface: t.sheet, font: t.font, horizontal: true })],
  };
}

export interface RevenuePoint {
  label: string;
  faturamento: number;
}

export function revenueChart(
  points: readonly RevenuePoint[],
  pontoEquilibrio: number | null,
  selected: number | null,
  t: ChartTheme,
): BarChartConfig {
  const colors = points.map((p, i) => {
    const base = pontoEquilibrio != null && p.faturamento < pontoEquilibrio ? t.out : t.s1;
    return selected != null && selected !== i ? alpha(base, 0.32) : base;
  });
  const top = Math.max(0, ...points.map((p) => p.faturamento), pontoEquilibrio ?? 0);

  return {
    type: 'bar',
    data: {
      labels: points.map((p) => p.label),
      datasets: [
        {
          label: 'Faturamento bruto',
          data: points.map((p) => p.faturamento),
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => alpha(c.slice(0, 7), 0.78)),
          borderRadius: 4,
          borderSkipped: 'start',
          maxBarThickness: 24,
        },
      ],
    },
    options: {
      layout: { padding: { top: 20 } },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: top * 1.12,
          grid: { color: t.rule, drawTicks: false },
          border: { display: false },
          ticks: { color: t.ink3, padding: 8, maxTicksLimit: 5, callback: (v) => brlCompact(Number(v)) },
        },
        x: {
          grid: { display: false },
          border: { color: t.ruleStrong },
          ticks: { color: t.ink2, font: { weight: 500 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: {
            label: (item: TooltipItem<'bar'>) => `${brl(Number(item.raw))}  faturamento`,
            afterLabel: (item: TooltipItem<'bar'>) =>
              pontoEquilibrio == null
                ? ''
                : Number(item.raw) >= pontoEquilibrio
                  ? `${brlCompact(Number(item.raw) - pontoEquilibrio)} acima do ponto de equilíbrio`
                  : `${brlCompact(pontoEquilibrio - Number(item.raw))} abaixo do ponto de equilíbrio`,
          },
        },
      },
    },
    plugins: [
      ...(pontoEquilibrio != null
        ? [
            referenceLine({
              value: pontoEquilibrio,
              label: `Ponto de equilíbrio ${brlCompact(pontoEquilibrio)}`,
              t,
              barLabels: points.length <= 6 ? points.map((p) => brlCompact(p.faturamento)) : [],
            }),
          ]
        : []),
      barValueLabels({
        text: (i) => (points.length <= 6 ? brlCompact(points[i].faturamento) : ''),
        color: t.ink,
        surface: t.sheet,
        font: t.font,
        horizontal: false,
      }),
    ],
  };
}

export interface MarginPoint {
  label: string;
  bruta: number | null;
  ebitda: number | null;
  liquida: number | null;
}

export const MARGIN_SERIES = [
  { key: 'bruta', label: 'Margem bruta', color: '--viz-s1' },
  { key: 'ebitda', label: 'Margem EBITDA', color: '--viz-s2' },
  { key: 'liquida', label: 'Margem líquida', color: '--viz-s3' },
] as const;

export function marginsChart(points: readonly MarginPoint[], selected: number | null, t: ChartTheme): LineChartConfig {
  const colorOf = { '--viz-s1': t.s1, '--viz-s2': t.s2, '--viz-s3': t.s3 };

  return {
    type: 'line',
    data: {
      labels: points.map((p) => p.label),
      datasets: MARGIN_SERIES.map((s) => {
        const color = colorOf[s.color];
        return {
          label: s.label,
          data: points.map((p) => (p[s.key] == null ? null : p[s.key]! * 100)),
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          pointBorderColor: t.sheet,
          pointBorderWidth: 2,
          pointRadius: points.map((_, i) => (selected === i ? 6 : 4)),
          pointHoverRadius: 6,
          pointHitRadius: 14,
          borderWidth: 2,
          borderCapStyle: 'round' as const,
          borderJoinStyle: 'round' as const,
          tension: 0,
          spanGaps: true,
        };
      }),
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { right: 56, top: 8 } },
      scales: {
        y: {
          suggestedMin: 0,
          grid: {
            color: (ctx) => (ctx.tick?.value === 0 ? t.ruleStrong : t.rule),
            drawTicks: false,
          },
          border: { display: false },
          ticks: { color: t.ink3, padding: 8, maxTicksLimit: 6, callback: (v) => `${num(Number(v))}%` },
        },
        x: {
          offset: true,
          grid: { display: false },
          border: { color: t.ruleStrong },
          ticks: { color: t.ink2, font: { weight: 500 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: {
            label: (item: TooltipItem<'line'>) => `${pct(Number(item.raw) / 100)}  ${item.dataset.label}`,
          },
        },
      },
    },
    plugins: [crosshair(t.ruleStrong), lineEndLabels({ text: (v) => pct(v / 100), t })],
  };
}

export const FLOW_SERIES = [
  { key: 'faturamentoBruto', label: 'Entradas (faturamento)', color: '--viz-s1', stack: 'entradas' },
  { key: 'deducoes', label: 'Impostos', color: '--viz-s2', stack: 'saidas' },
  { key: 'custosVariaveis', label: 'Compras e fornecedores', color: '--viz-s3', stack: 'saidas' },
  { key: 'custosFixos', label: 'Custos fixos', color: '--viz-s4', stack: 'saidas' },
  { key: 'folha', label: 'Folha e pró-labore', color: '--viz-s5', stack: 'saidas' },
  { key: 'despesasFinanceiras', label: 'Juros e tarifas', color: '--viz-s6', stack: 'saidas' },
] as const;

function signedCompact(value: number): string {
  return value > 0 ? `+${brlCompact(value)}` : brlCompact(value);
}

export function cashFlowChart(points: readonly MonthlyPoint[], selected: number | null, t: ChartTheme): BarChartConfig {
  const colorOf = { '--viz-s1': t.s1, '--viz-s2': t.s2, '--viz-s3': t.s3, '--viz-s4': t.s4, '--viz-s5': t.s5, '--viz-s6': t.s6 };
  const saidas = (p: MonthlyPoint) =>
    FLOW_SERIES.reduce((sum, s) => (s.stack === 'saidas' ? sum + p.dre[s.key] : sum), 0);
  const topSegment = points.map((p) =>
    FLOW_SERIES.reduce((top, s, i) => (s.stack === 'saidas' && p.dre[s.key] > 0 ? i : top), -1),
  );
  const top = Math.max(0, ...points.map((p) => Math.max(p.dre.faturamentoBruto, saidas(p))));

  return {
    type: 'bar',
    data: {
      labels: points.map((p) => p.label),
      datasets: FLOW_SERIES.map((s, si) => {
        const color = colorOf[s.color];
        const colors = points.map((_, i) => (selected != null && selected !== i ? alpha(color, 0.3) : color));
        const isTop = (i: number) => s.stack === 'entradas' || topSegment[i] === si;
        return {
          label: s.label,
          stack: s.stack,
          data: points.map((p) => p.dre[s.key]),
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => alpha(c.slice(0, 7), 0.78)),
          borderColor: t.sheet,
          borderWidth: (ctx: ScriptableContext<'bar'>) => (isTop(ctx.dataIndex) ? 0 : { top: 2, right: 0, bottom: 0, left: 0 }),
          borderRadius: (ctx: ScriptableContext<'bar'>) => (isTop(ctx.dataIndex) ? 4 : 0),
          borderSkipped: 'start' as const,
          maxBarThickness: 24,
          barPercentage: 0.92,
        };
      }),
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 26 } },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          border: { color: t.ruleStrong },
          ticks: { color: t.ink2, font: { weight: 500 } },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          suggestedMax: top * 1.06,
          grid: { color: t.rule, drawTicks: false },
          border: { display: false },
          ticks: { color: t.ink3, padding: 8, maxTicksLimit: 5, callback: (v) => brlCompact(Number(v)) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(t),
          callbacks: {
            label: (item: TooltipItem<'bar'>) => `${brl(Number(item.raw))}  ${item.dataset.label}`,
            footer: (items: TooltipItem<'bar'>[]) => `Saldo do mês: ${brl(points[items[0].dataIndex].dre.lucroLiquido)}`,
          },
        },
      },
    },
    plugins: [
      tightGroups(56),
      categoryLabels({
        text: (i) => {
          const saldo = signedCompact(points[i].dre.lucroLiquido);
          return [`Saldo ${saldo}`, saldo];
        },
        t,
      }),
    ],
  };
}
