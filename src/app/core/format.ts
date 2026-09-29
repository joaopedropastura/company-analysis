export const MINUS = '\u2212';

const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const brlShort = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const num0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const numInput = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const numEdit = new Intl.NumberFormat('pt-BR', { useGrouping: false, maximumFractionDigits: 2 });
const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct0 = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

const withMinus = (s: string) => s.replace('-', MINUS);

export function brl(value: number, cents = false): string {
  return withMinus((cents ? brl2 : brl0).format(value));
}

export function brlCompact(value: number): string {
  return withMinus(brlShort.format(value));
}

export function num(value: number): string {
  return withMinus(num0.format(value));
}

export function num2dp(value: number): string {
  return withMinus(num2.format(value));
}

export function numForInput(value: number | null): string {
  return value == null ? '' : withMinus(numInput.format(value));
}

export function numForEdit(value: number | null): string {
  return value == null ? '' : numEdit.format(value);
}

export function pct(ratio: number, digits: 0 | 1 = 1): string {
  return withMinus((digits === 0 ? pct0 : pct1).format(ratio));
}

export function signedPct(ratio: number): string {
  const s = pct(Math.abs(ratio));
  if (ratio > 0) return `+${s}`;
  if (ratio < 0) return `${MINUS}${s}`;
  return s;
}

export function parseNumberBR(input: unknown): number | null {
  if (input == null || typeof input === 'boolean' || input instanceof Date) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;

  let s = String(input).trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/R\$|\s|\u00a0/gi, '');
  if (/^[-\u2212]/.test(s)) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^\d[\d.,]*$/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = (s.match(/,/g) ?? []).length === 1 ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (lastDot > -1) {
    if ((s.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

export const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export function monthLabelFromDate(d: Date): string {
  return `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
}

export function recentMonthLabels(count: number, today = new Date()): string[] {
  const labels: string[] = [];
  for (let i = count; i >= 1; i--) {
    labels.push(monthLabelFromDate(new Date(today.getFullYear(), today.getMonth() - i, 1)));
  }
  return labels;
}

export function nextMonthLabel(label: string, fallbackIndex: number): string {
  const clean = label.trim().toLowerCase();

  const numbered = /^m[eê]s\s*(\d+)$/.exec(clean);
  if (numbered) return `Mês ${Number(numbered[1]) + 1}`;

  const named = /^([a-zç]{3})[a-zç]*\.?(?:\s*[/\-\s]\s*(\d{2}|\d{4}))?$/.exec(clean);
  if (named) {
    const idx = MONTHS_PT.indexOf(named[1] as (typeof MONTHS_PT)[number]);
    if (idx > -1) {
      const next = (idx + 1) % 12;
      let year = named[2];
      if (year && next === 0) year = String(Number(year) + 1).padStart(year.length, '0');
      return year ? `${MONTHS_PT[next]}/${year}` : MONTHS_PT[next];
    }
  }
  return `Mês ${fallbackIndex + 1}`;
}

export function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
