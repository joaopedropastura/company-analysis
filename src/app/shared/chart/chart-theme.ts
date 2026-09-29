import type { Chart, Plugin } from 'chart.js';

export interface ChartTheme {
  ink: string;
  ink2: string;
  ink3: string;
  rule: string;
  ruleStrong: string;
  sheet: string;
  context: string;
  out: string;
  result: string;
  s1: string;
  s2: string;
  s3: string;
  s4: string;
  s5: string;
  s6: string;
  font: string;
}

export function readChartTheme(): ChartTheme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    rule: v('--rule'),
    ruleStrong: v('--rule-strong'),
    sheet: v('--sheet'),
    context: v('--viz-context'),
    out: v('--viz-out'),
    result: v('--viz-result'),
    s1: v('--viz-s1'),
    s2: v('--viz-s2'),
    s3: v('--viz-s3'),
    s4: v('--viz-s4'),
    s5: v('--viz-s5'),
    s6: v('--viz-s6'),
    font: "'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
}

export function alpha(hex: string, opacity: number): string {
  const a = Math.round(Math.min(Math.max(opacity, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex;
}

export function tooltipStyle(t: ChartTheme) {
  return {
    backgroundColor: t.sheet,
    borderColor: t.ruleStrong,
    borderWidth: 1,
    titleColor: t.ink2,
    bodyColor: t.ink,
    footerColor: t.ink3,
    titleFont: { family: t.font, size: 12, weight: 500 },
    bodyFont: { family: t.font, size: 13, weight: 600 },
    footerFont: { family: t.font, size: 12, weight: 400 },
    padding: 10,
    cornerRadius: 8,
    caretSize: 0,
    boxWidth: 12,
    boxHeight: 2,
    boxPadding: 6,
    usePointStyle: false,
  };
}

export function barValueLabels(opts: {
  text: (index: number) => string;
  color: string;
  surface: string;
  font: string;
  horizontal: boolean;
}): Plugin<'bar'> {
  return {
    id: 'barValueLabels',
    afterDatasetsDraw(chart: Chart<'bar'>) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = `600 12px ${opts.font}`;
      meta.data.forEach((bar, i) => {
        const text = opts.text(i);
        if (!text) return;
        const { x, y, base } = bar.getProps(['x', 'y', 'base'], true) as { x: number; y: number; base: number };
        const width = ctx.measureText(text).width;
        let left: number;
        let middle: number;
        if (opts.horizontal) {
          left = Math.max(x, base) + 8;
          middle = y;
        } else {
          const negative = y > base;
          left = x - width / 2;
          middle = negative ? Math.max(y, base) + 13 : Math.min(y, base) - 13;
        }
        ctx.fillStyle = opts.surface;
        ctx.fillRect(left - 3, middle - 9, width + 6, 18);
        ctx.fillStyle = opts.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, left, middle);
      });
      ctx.restore();
    },
  };
}

export function referenceLine(opts: {
  value: number;
  label: string;
  t: ChartTheme;
  barLabels?: readonly string[];
}): Plugin<'bar'> {
  return {
    id: 'referenceLine',
    afterDatasetsDraw(chart: Chart<'bar'>) {
      const y = chart.scales['y']?.getPixelForValue(opts.value);
      const { left, right, top, bottom } = chart.chartArea;
      if (y == null || y < top || y > bottom) return;
      const { ctx } = chart;
      ctx.save();
      ctx.strokeStyle = opts.t.ink2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();

      ctx.font = `600 12px ${opts.t.font}`;
      const needed = ctx.measureText(opts.label).width + 16;
      const bars = chart
        .getDatasetMeta(0)
        .data.map((bar, i) => {
          const { x, width } = bar.getProps(['x', 'width'], true) as { x: number; width: number };
          const text = opts.barLabels?.[i];
          const half = Math.max(width, text ? ctx.measureText(text).width + 12 : 0) / 2;
          return [x - half, x + half] as const;
        })
        .sort((a, b) => a[0] - b[0]);
      let gap = { start: left, size: 0 };
      let cursor = left;
      for (const [start, end] of bars) {
        if (start - cursor > gap.size) gap = { start: cursor, size: start - cursor };
        cursor = Math.max(cursor, end);
      }
      if (right - cursor > gap.size) gap = { start: cursor, size: right - cursor };

      if (gap.size >= needed) {
        const cx = gap.start + gap.size / 2;
        ctx.fillStyle = opts.t.sheet;
        ctx.fillRect(cx - needed / 2 + 4, y - 22, needed - 8, 18);
        ctx.fillStyle = opts.t.ink2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(opts.label, cx, y - 6);
      }
      ctx.restore();
    },
  };
}

export function categoryLabels(opts: { text: (index: number) => string[]; t: ChartTheme }): Plugin<'bar'> {
  return {
    id: 'categoryLabels',
    afterDatasetsDraw(chart: Chart<'bar'>) {
      const x = chart.scales['x'];
      if (!x) return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = `600 12px ${opts.t.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labels = chart.data.labels ?? [];
      const band = (chart.chartArea.right - chart.chartArea.left) / Math.max(labels.length, 1);
      labels.forEach((_, i) => {
        const text = opts.text(i).find((t) => ctx.measureText(t).width + 8 <= band);
        if (!text) return;
        let top = Infinity;
        chart.data.datasets.forEach((__, di) => {
          const bar = chart.getDatasetMeta(di).data[i];
          if (!bar) return;
          const { y, base } = bar.getProps(['y', 'base'], true) as { y: number; base: number };
          top = Math.min(top, y, base);
        });
        if (!Number.isFinite(top)) return;
        const width = ctx.measureText(text).width;
        const cx = Math.min(
          Math.max(x.getPixelForValue(i), chart.chartArea.left + width / 2),
          chart.chartArea.right - width / 2,
        );
        ctx.fillStyle = opts.t.sheet;
        ctx.fillRect(cx - width / 2 - 3, top - 22, width + 6, 18);
        ctx.fillStyle = opts.t.ink;
        ctx.fillText(text, cx, top - 13);
      });
      ctx.restore();
    },
  };
}

export function tightGroups(groupWidth: number): Plugin<'bar'> {
  return {
    id: 'tightGroups',
    beforeUpdate(chart: Chart<'bar'>) {
      const band = chart.width / Math.max(chart.data.labels?.length ?? 1, 1);
      const share = Math.min(0.7, Math.max(0.2, groupWidth / band));
      chart.data.datasets.forEach((ds) => (ds.categoryPercentage = share));
    },
  };
}

export function crosshair(color: string): Plugin<'line'> {
  return {
    id: 'crosshair',
    beforeDatasetsDraw(chart: Chart<'line'>) {
      const active = chart.tooltip?.getActiveElements();
      if (!active?.length) return;
      const x = active[0].element.x;
      const { top, bottom } = chart.chartArea;
      const { ctx } = chart;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.restore();
    },
  };
}

export function lineEndLabels(opts: { text: (value: number) => string; t: ChartTheme }): Plugin<'line'> {
  return {
    id: 'lineEndLabels',
    afterDatasetsDraw(chart: Chart<'line'>) {
      const { ctx } = chart;
      const items = chart.data.datasets
        .map((ds, i) => {
          const meta = chart.getDatasetMeta(i);
          const last = meta.data.length - 1;
          const value = ds.data[last];
          if (meta.hidden || last < 0 || typeof value !== 'number') return null;
          return { x: meta.data[last].x, y: meta.data[last].y, text: opts.text(value) };
        })
        .filter((i): i is { x: number; y: number; text: string } => i != null)
        .sort((a, b) => a.y - b.y);

      ctx.save();
      ctx.font = `600 12px ${opts.t.font}`;
      ctx.fillStyle = opts.t.ink;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let lastY = -Infinity;
      for (const item of items) {
        if (item.y - lastY < 15) continue;
        ctx.fillText(item.text, item.x + 10, item.y);
        lastY = item.y;
      }
      ctx.restore();
    },
  };
}
