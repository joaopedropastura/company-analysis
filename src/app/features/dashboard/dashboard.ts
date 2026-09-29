import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  computeCycle,
  computeDre,
  computeIndicators,
  hasData,
  MonthlyPoint,
  ratio,
  sumDre,
  waterfallSteps,
  workingCapital,
} from '../../core/finance/finance';
import { brl, brlCompact, num, num2dp, pct, signedPct } from '../../core/format';
import { CYCLE_ROWS, DRE_LINES, emptyCycle } from '../../core/models/company';
import { CompanyStore } from '../../core/services/company-store';
import { ThemeService } from '../../core/services/theme';
import { UiState } from '../../core/services/ui-state';
import { ChartCanvas } from '../../shared/chart/chart';
import { readChartTheme } from '../../shared/chart/chart-theme';
import { VizTable, VizTableData } from '../../shared/viz-table/viz-table';
import {
  cashFlowChart,
  FLOW_SERIES,
  MARGIN_SERIES,
  marginsChart,
  revenueChart,
  waterfallChart,
  WaterfallScale,
} from './dashboard-charts';
import { ProfitRing } from './profit-ring/profit-ring';

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  note: string;
  delta?: { text: string; good: boolean };
}

type ChartKey = 'waterfall' | 'flow' | 'revenue' | 'margins';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ChartCanvas, VizTable, ProfitRing],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly empresa = input<string>();

  private readonly store = inject(CompanyStore);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  protected readonly ui = inject(UiState);

  protected readonly marginSeries = MARGIN_SERIES;
  protected readonly flowSeries = FLOW_SERIES;
  protected readonly cycleRows = CYCLE_ROWS;

  protected readonly companies = this.store.companies;
  protected readonly company = computed(() => this.store.byId(this.empresa()) ?? this.companies()[0] ?? null);

  protected readonly months = computed(() => (this.company()?.meses ?? []).filter(hasData));
  protected readonly series = computed<MonthlyPoint[]>(() =>
    this.months().map((m) => ({ label: m.label, dre: computeDre(m) })),
  );

  protected readonly period = linkedSignal<string | undefined, string>({
    source: () => this.company()?.id,
    computation: () => 'all',
  });
  protected readonly selectedIndex = computed(() => {
    const p = this.period();
    const i = p === 'all' ? -1 : this.months().findIndex((m) => m.id === p);
    return i < 0 ? null : i;
  });
  private readonly slice = computed(() => {
    const i = this.selectedIndex();
    return i == null ? this.months() : [this.months()[i]];
  });

  protected readonly ind = computed(() => computeIndicators(this.slice()));
  private readonly indAll = computed(() => computeIndicators(this.months()));

  protected readonly periodText = computed(() => {
    const ms = this.slice();
    if (!ms.length) return '';
    return ms.length === 1 ? `Mês de ${ms[0].label}` : `Acumulado de ${ms[0].label} a ${ms[ms.length - 1].label}`;
  });

  protected readonly profitability = computed(() => {
    const ind = this.ind();
    return [
      { label: 'Margem bruta', formula: 'Lucro bruto ÷ receita líquida', value: ind.margemBruta },
      { label: 'Margem EBITDA', formula: 'EBITDA (resultado operacional) ÷ receita líquida', value: ind.margemEbitda },
      { label: 'Margem líquida', formula: 'Lucro líquido ÷ receita líquida', value: ind.margemLiquida },
    ].map((i) => ({
      ...i,
      text: i.value == null ? '—' : pct(i.value),
      negative: (i.value ?? 0) < 0,
      fill: i.value == null ? 0 : Math.min(Math.abs(i.value), 1) * 100,
    }));
  });
  protected readonly receitaLiquidaText = computed(() => brl(this.ind().dre.receitaLiquida));

  protected readonly cash = computed(() => {
    const ind = this.ind();
    const d = ind.dre;
    const i = this.selectedIndex();
    const prev = i != null && i > 0 ? this.series()[i - 1] : null;
    const change = prev ? ratio(d.faturamentoBruto - prev.dre.faturamentoBruto, prev.dre.faturamentoBruto) : null;
    return {
      lucro: brl(d.lucroLiquido),
      entradas: brl(d.faturamentoBruto),
      saidas: brl(d.faturamentoBruto - d.lucroLiquido),
      delta:
        change != null
          ? { text: signedPct(change), good: change >= 0, vs: `vs ${prev!.label}` }
          : null,
    };
  });

  protected readonly kpis = computed<Kpi[]>(() => {
    const ind = this.ind();
    const d = ind.dre;
    const pe = ind.pontoEquilibrio;
    const ms = ind.margemSeguranca;

    const shareOfRevenue = (v: number) => (d.faturamentoBruto > 0 ? `${pct(v / d.faturamentoBruto)} do faturamento` : '');

    return [
      {
        label: 'Custos fixos',
        value: brlCompact(d.custosFixos + d.folha),
        note: `${shareOfRevenue(d.custosFixos + d.folha)}, com folha e pró-labore`,
      },
      {
        label: 'Custos variáveis',
        value: brlCompact(d.custosVariaveis),
        note: shareOfRevenue(d.custosVariaveis),
      },
      {
        label: 'Ponto de equilíbrio',
        value: pe == null ? '—' : brlCompact(pe),
        unit: pe == null ? undefined : '/mês',
        note:
          pe == null || ms == null
            ? 'Margem de contribuição não é positiva'
            : ms >= 0
              ? `Fatura ${pct(ms)} acima do necessário`
              : `Faltam ${brlCompact(pe - ind.faturamentoMedio)}/mês para empatar`,
      },
      {
        label: 'Juros e tarifas',
        value: brlCompact(d.despesasFinanceiras),
        note:
          d.resultadoOperacional > 0
            ? `${pct(d.despesasFinanceiras / d.resultadoOperacional, 0)} do resultado operacional`
            : d.faturamentoBruto > 0
              ? `${pct(d.despesasFinanceiras / d.faturamentoBruto)} do faturamento`
              : '',
      },
    ];
  });

  private readonly chartTheme = computed(() => {
    this.theme.theme();
    return readChartTheme();
  });
  protected readonly scale = signal<WaterfallScale>('per100');
  private readonly steps = computed(() => waterfallSteps(this.ind().dre));

  protected readonly waterfall = computed(() =>
    waterfallChart(this.steps(), this.ind().dre.faturamentoBruto, this.scale(), this.chartTheme()),
  );
  protected readonly waterfallAria = computed(() => {
    const d = this.ind().dre;
    if (d.faturamentoBruto <= 0) return 'Cascata do DRE sem faturamento no período.';
    const per100 = num2dp((Math.abs(d.lucroLiquido) / d.faturamentoBruto) * 100);
    return `Cascata do DRE: de cada R$ 100 faturados, ${d.lucroLiquido >= 0 ? `R$ ${per100} viram lucro` : `a empresa perde R$ ${per100}`}.`;
  });
  protected readonly waterfallTable = computed<VizTableData>(() => {
    const fat = this.ind().dre.faturamentoBruto;
    return {
      columns: ['Conta', 'Valor', 'A cada R$\u00a0100'],
      rows: this.steps().map((s) => ({
        label: s.label,
        values: [brl(s.value), fat > 0 ? num2dp((s.value / fat) * 100) : '—'],
      })),
    };
  });

  protected readonly flow = computed(() => cashFlowChart(this.series(), this.selectedIndex(), this.chartTheme()));
  protected readonly flowTable = computed<VizTableData>(() => ({
    columns: ['Mês', ...FLOW_SERIES.map((s) => s.label), 'Saldo'],
    rows: this.series().map((p) => ({
      label: p.label,
      values: [...FLOW_SERIES.map((s) => brl(p.dre[s.key])), brl(p.dre.lucroLiquido)],
    })),
  }));

  protected readonly pontoEquilibrio = computed(() => this.indAll().pontoEquilibrio);
  protected readonly pontoEquilibrioText = computed(() => {
    const pe = this.pontoEquilibrio();
    return pe == null ? '' : `${brlCompact(pe)} por mês`;
  });
  protected readonly revenue = computed(() =>
    revenueChart(
      this.series().map((p) => ({ label: p.label, faturamento: p.dre.faturamentoBruto })),
      this.pontoEquilibrio(),
      this.selectedIndex(),
      this.chartTheme(),
    ),
  );
  protected readonly revenueTable = computed<VizTableData>(() => {
    const pe = this.pontoEquilibrio();
    return {
      columns: ['Mês', 'Faturamento', 'Diferença para o ponto de equilíbrio'],
      rows: this.series().map((p) => ({
        label: p.label,
        values: [brl(p.dre.faturamentoBruto), pe == null ? '—' : brl(p.dre.faturamentoBruto - pe)],
      })),
    };
  });

  private readonly marginPoints = computed(() =>
    this.series().map((p) => ({
      label: p.label,
      bruta: ratio(p.dre.margemContribuicao, p.dre.receitaLiquida),
      ebitda: ratio(p.dre.resultadoOperacional, p.dre.receitaLiquida),
      liquida: ratio(p.dre.lucroLiquido, p.dre.receitaLiquida),
    })),
  );
  protected readonly margins = computed(() => marginsChart(this.marginPoints(), this.selectedIndex(), this.chartTheme()));
  protected readonly marginsTable = computed<VizTableData>(() => ({
    columns: ['Mês', 'Margem bruta', 'Margem EBITDA', 'Margem líquida'],
    rows: this.marginPoints().map((p) => ({
      label: p.label,
      values: [p.bruta, p.ebitda, p.liquida].map((v) => (v == null ? '—' : pct(v))),
    })),
  }));

  private readonly tables = signal<Partial<Record<ChartKey, boolean>>>({});
  protected isTable(key: ChartKey): boolean {
    return !!this.tables()[key];
  }
  protected toggleTable(key: ChartKey): void {
    this.tables.update((t) => ({ ...t, [key]: !t[key] }));
  }

  protected readonly cycle = computed(() => computeCycle(this.company()?.ciclo ?? emptyCycle()));
  protected readonly workingCapitalText = computed(() => {
    const value = workingCapital(this.ind(), this.company()?.ciclo ?? emptyCycle());
    return value != null && value > 0 ? brlCompact(value) : null;
  });

  protected readonly dreTable = computed(() => {
    const series = this.series();
    const total = sumDre(series.map((p) => p.dre));
    const signed = (outflow: boolean, v: number) => (outflow ? -v : v);

    return DRE_LINES.map((line) => {
      const outflow = line.kind === 'input' && line.sign !== '+';
      const values = series.map((p) => signed(outflow, p.dre[line.key]));
      const tot = signed(outflow, total[line.key]);
      const first = series[0]?.dre[line.key];
      const last = series[series.length - 1]?.dre[line.key];
      const change = series.length >= 2 && first ? (last - first) / Math.abs(first) : null;
      const rising = change != null && change > 0;
      return {
        line,
        cells: values.map((v) => ({ text: num(v), neg: v < 0 })),
        total: { text: num(tot), neg: tot < 0 },
        share: total.faturamentoBruto > 0 ? pct(total[line.key] / total.faturamentoBruto) : '—',
        change: change == null || change === 0 ? '—' : `${rising ? '▲' : '▼'} ${signedPct(change)}`,
        changeGood: change == null || change === 0 ? null : outflow ? !rising : rising,
      };
    });
  });

  protected readonly dreLines = DRE_LINES;
  protected readonly longPeriod = computed(() => this.series().length > 6);
  protected readonly dreByMonth = computed(() => {
    const series = this.series();
    const total = sumDre(series.map((p) => p.dre));
    const cells = (dre: MonthlyPoint['dre']) =>
      DRE_LINES.map((line) => {
        const v = line.kind === 'input' && line.sign !== '+' ? -dre[line.key] : dre[line.key];
        return { text: num(v), neg: v < 0 };
      });
    return {
      rows: series.map((p) => ({ label: p.label, cells: cells(p.dre) })),
      total: cells(total),
      share: DRE_LINES.map((line) =>
        total.faturamentoBruto > 0 ? pct(total[line.key] / total.faturamentoBruto) : '—',
      ),
    };
  });

  protected readonly portfolio = computed(() =>
    this.companies().map((c) => {
      const ms = c.meses.filter(hasData);
      return {
        id: c.id,
        nome: c.nome,
        faturamento: ms.length ? `${brlCompact(computeIndicators(ms).faturamentoMedio)} por mês` : 'Sem fluxo de caixa',
      };
    }),
  );

  protected readonly generatedAt = computed(() => {
    this.ui.printing();
    return new Date().toLocaleDateString('pt-BR');
  });

  protected exportPdf(): void {
    const c = this.company();
    if (c) this.ui.exportPdf(`A SOARES ADMIN - ${c.nome} - ${this.periodText()}`);
  }

  protected selectCompany(id: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { empresa: id } });
  }

  protected loadSamples(): void {
    const added = this.store.loadSamples();
    this.ui.toast(added ? `${added} empresas de exemplo carregadas` : 'As empresas de exemplo já estão na carteira');
  }
}
