import { emptyMonth, MonthEntry } from '../models/company';
import { computeCycle, computeDre, computeIndicators, hasData, waterfallSteps, workingCapital } from './finance';

function month(values: Partial<MonthEntry>): MonthEntry {
  return { ...emptyMonth('jan'), ...values };
}

const padaria = month({
  faturamentoBruto: 182000,
  deducoes: 12740,
  custosVariaveis: 78260,
  custosFixos: 24500,
  folha: 41000,
  despesasFinanceiras: 9800,
});

describe('finance', () => {
  it('calcula o DRE em cascata a partir das linhas informadas', () => {
    const d = computeDre(padaria);
    expect(d.receitaLiquida).toBe(169260);
    expect(d.margemContribuicao).toBe(91000);
    expect(d.resultadoOperacional).toBe(25500);
    expect(d.lucroLiquido).toBe(15700);
  });

  it('trata saídas digitadas com sinal negativo como saídas', () => {
    const d = computeDre(month({ faturamentoBruto: 1000, deducoes: -100, custosVariaveis: -400 }));
    expect(d.margemContribuicao).toBe(500);
  });

  it('reconhece meses sem nenhum valor', () => {
    expect(hasData(emptyMonth('jan'))).toBeFalse();
    expect(hasData(month({ folha: 0 }))).toBeTrue();
  });

  it('calcula margens, ponto de equilíbrio e margem de segurança', () => {
    const ind = computeIndicators([padaria]);
    const mc = 91000 / 182000;
    const fixos = 24500 + 41000 + 9800;
    expect(ind.mcPct).toBeCloseTo(mc, 6);
    expect(ind.margemBruta!).toBeCloseTo(91000 / 169260, 6);
    expect(ind.margemEbitda!).toBeCloseTo(25500 / 169260, 6);
    expect(ind.margemLiquida!).toBeCloseTo(15700 / 169260, 6);
    expect(ind.pontoEquilibrio!).toBeCloseTo(fixos / mc, 2);
    expect(ind.margemSeguranca!).toBeCloseTo((182000 - fixos / mc) / 182000, 6);
  });

  it('usa médias mensais quando o período tem mais de um mês', () => {
    const ind = computeIndicators([padaria, month({ ...padaria, id: 'fev', label: 'fev' })]);
    expect(ind.monthCount).toBe(2);
    expect(ind.faturamentoMedio).toBe(182000);
    expect(ind.dre.faturamentoBruto).toBe(364000);
  });

  it('não inventa ponto de equilíbrio com margem de contribuição negativa', () => {
    const ind = computeIndicators([month({ faturamentoBruto: 100, custosVariaveis: 150, custosFixos: 10 })]);
    expect(ind.pontoEquilibrio).toBeNull();
  });

  it('calcula o ciclo operacional e o financeiro, com estoque vazio contando como zero', () => {
    expect(computeCycle({ pme: 30, pmr: 45, pmp: 15 })).toEqual({ pme: 30, pmr: 45, pmp: 15, operacional: 75, financeiro: 60 });
    expect(computeCycle({ pme: null, pmr: 35, pmp: 20 }).financeiro).toBe(15);
    expect(computeCycle({ pme: 10, pmr: null, pmp: 20 })).toEqual(jasmine.objectContaining({ operacional: null, financeiro: null }));
  });

  it('estima o capital de giro preso nos prazos', () => {
    const ind = computeIndicators([padaria]);
    expect(workingCapital(ind, { pme: 12, pmr: 28, pmp: 21 })!).toBeCloseTo((182000 / 30) * 28 + (78260 / 30) * (12 - 21), 2);
    expect(workingCapital(ind, { pme: 12, pmr: null, pmp: 21 })).toBeNull();
  });

  it('monta a cascata terminando no lucro líquido', () => {
    const steps = waterfallSteps(computeDre(padaria));
    expect(steps.length).toBe(10);
    expect(steps[0]).toEqual(jasmine.objectContaining({ kind: 'level', start: 0, end: 182000 }));
    expect(steps[1]).toEqual(jasmine.objectContaining({ kind: 'out', start: 169260, end: 182000, value: -12740 }));
    expect(steps[9]).toEqual(jasmine.objectContaining({ kind: 'result', start: 0, end: 15700 }));
  });
});
