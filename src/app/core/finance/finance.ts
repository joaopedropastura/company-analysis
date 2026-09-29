import { CycleTotalKey, DRE_INPUT_KEYS, DRE_LINES, DreInputKey, DreLineKey, FinancialCycle, MonthEntry } from '../models/company';

export type DreResult = Record<DreLineKey, number>;

export const EMPTY_DRE: DreResult = {
  faturamentoBruto: 0,
  deducoes: 0,
  receitaLiquida: 0,
  custosVariaveis: 0,
  margemContribuicao: 0,
  custosFixos: 0,
  folha: 0,
  resultadoOperacional: 0,
  despesasFinanceiras: 0,
  lucroLiquido: 0,
};

export interface MonthlyPoint {
  label: string;
  dre: DreResult;
}

export function hasData(month: Pick<MonthEntry, DreInputKey>): boolean {
  return DRE_INPUT_KEYS.some((k) => month[k] != null);
}

export function computeDre(month: Pick<MonthEntry, DreInputKey>): DreResult {
  const out = (k: DreInputKey) => Math.abs(month[k] ?? 0);
  const faturamentoBruto = month.faturamentoBruto ?? 0;
  const deducoes = out('deducoes');
  const custosVariaveis = out('custosVariaveis');
  const custosFixos = out('custosFixos');
  const folha = out('folha');
  const despesasFinanceiras = out('despesasFinanceiras');

  const receitaLiquida = faturamentoBruto - deducoes;
  const margemContribuicao = receitaLiquida - custosVariaveis;
  const resultadoOperacional = margemContribuicao - custosFixos - folha;
  const lucroLiquido = resultadoOperacional - despesasFinanceiras;

  return {
    faturamentoBruto,
    deducoes,
    receitaLiquida,
    custosVariaveis,
    margemContribuicao,
    custosFixos,
    folha,
    resultadoOperacional,
    despesasFinanceiras,
    lucroLiquido,
  };
}

export function sumDre(list: readonly DreResult[]): DreResult {
  const total = { ...EMPTY_DRE };
  for (const d of list) {
    for (const line of DRE_LINES) total[line.key] += d[line.key];
  }
  return total;
}

export function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

export interface Indicators {
  dre: DreResult;
  monthCount: number;
  faturamentoMedio: number;
  mcPct: number | null;
  margemBruta: number | null;
  margemEbitda: number | null;
  margemLiquida: number | null;
  custoFixoMensal: number;
  pontoEquilibrio: number | null;
  margemSeguranca: number | null;
}

export function computeIndicators(slice: readonly MonthEntry[]): Indicators {
  const dre = sumDre(slice.map(computeDre));
  const monthCount = slice.length;
  const n = Math.max(monthCount, 1);
  const fat = dre.faturamentoBruto;

  const faturamentoMedio = fat / n;
  const mcPct = ratio(dre.margemContribuicao, fat);
  const custoFixoMensal = (dre.custosFixos + dre.folha + dre.despesasFinanceiras) / n;
  const pontoEquilibrio = mcPct != null && mcPct > 0 ? custoFixoMensal / mcPct : null;
  const margemSeguranca =
    pontoEquilibrio != null && faturamentoMedio > 0 ? (faturamentoMedio - pontoEquilibrio) / faturamentoMedio : null;

  return {
    dre,
    monthCount,
    faturamentoMedio,
    mcPct,
    margemBruta: ratio(dre.margemContribuicao, dre.receitaLiquida),
    margemEbitda: ratio(dre.resultadoOperacional, dre.receitaLiquida),
    margemLiquida: ratio(dre.lucroLiquido, dre.receitaLiquida),
    custoFixoMensal,
    pontoEquilibrio,
    margemSeguranca,
  };
}

export interface WaterfallStep {
  key: DreLineKey;
  label: string;
  short: string;
  hint: string;
  kind: 'level' | 'out' | 'result';
  start: number;
  end: number;
  value: number;
}

export function waterfallSteps(dre: DreResult): WaterfallStep[] {
  let level = 0;
  return DRE_LINES.map((line) => {
    const base = { key: line.key, label: line.label, short: line.short, hint: line.hint };
    if (line.kind === 'total' || line.key === 'faturamentoBruto') {
      level = dre[line.key];
      const kind = line.key === 'lucroLiquido' ? 'result' : 'level';
      return { ...base, kind, start: 0, end: level, value: level };
    }
    const amount = dre[line.key];
    const step: WaterfallStep = { ...base, kind: 'out', start: level - amount, end: level, value: -amount };
    level -= amount;
    return step;
  });
}

export type CycleResult = FinancialCycle & Record<CycleTotalKey, number | null>;

export function computeCycle(ciclo: FinancialCycle): CycleResult {
  const operacional = ciclo.pmr != null ? (ciclo.pme ?? 0) + ciclo.pmr : null;
  const financeiro = operacional != null && ciclo.pmp != null ? operacional - ciclo.pmp : null;
  return { ...ciclo, operacional, financeiro };
}

export function workingCapital(ind: Indicators, ciclo: FinancialCycle): number | null {
  if (ciclo.pmr == null || ciclo.pmp == null || ind.monthCount === 0) return null;
  const vendasDia = ind.faturamentoMedio / 30;
  const custoDia = ind.dre.custosVariaveis / ind.monthCount / 30;
  return vendasDia * ciclo.pmr + custoDia * ((ciclo.pme ?? 0) - ciclo.pmp);
}
