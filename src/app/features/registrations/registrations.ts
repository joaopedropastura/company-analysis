import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { computeCycle, computeDre, hasData, sumDre } from '../../core/finance/finance';
import { brl, recentMonthLabels } from '../../core/format';
import {
  Company,
  CompanyInfo,
  CYCLE_ROWS,
  emptyCycle,
  emptyInfo,
  emptyMonth,
  FinancialCycle,
  MonthEntry,
} from '../../core/models/company';
import { CompanyStore } from '../../core/services/company-store';
import { ExcelImporter, ImportResult } from '../../core/services/excel-import';
import { UiState } from '../../core/services/ui-state';
import { DreGrid } from './dre-grid/dre-grid';
import { HasUnsavedChanges } from './unsaved-changes.guard';

interface Draft {
  info: CompanyInfo;
  meses: MonthEntry[];
  ciclo: FinancialCycle;
}

type TextField = 'nome' | 'segmento' | 'responsavel';

const SEGMENTS = [
  'Varejo',
  'Varejo alimentício',
  'Comércio atacadista',
  'Indústria',
  'Serviços',
  'Saúde',
  'Tecnologia',
  'Construção civil',
  'Agronegócio',
  'Educação',
  'Logística e transporte',
];

@Component({
  selector: 'app-registrations',
  imports: [RouterLink, RouterLinkActive, DreGrid],
  templateUrl: './registrations.html',
  styleUrl: './registrations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class Registrations implements HasUnsavedChanges {
  readonly id = input<string>();

  private readonly store = inject(CompanyStore);
  private readonly importer = inject(ExcelImporter);
  private readonly router = inject(Router);
  protected readonly ui = inject(UiState);

  protected readonly segments = SEGMENTS;
  protected readonly cycleRows = CYCLE_ROWS;

  protected readonly companies = this.store.companies;
  protected readonly existing = computed(() => this.store.byId(this.id()));

  protected readonly info = signal<CompanyInfo>(emptyInfo());
  protected readonly meses = signal<MonthEntry[]>([]);
  protected readonly ciclo = signal<FinancialCycle>(emptyCycle());
  protected readonly cycleResult = computed(() => computeCycle(this.ciclo()));

  private readonly snapshot = computed(() => JSON.stringify([this.info(), this.meses(), this.ciclo()]));
  private readonly baseline = signal('');
  protected readonly dirty = computed(() => this.snapshot() !== this.baseline());
  protected readonly submitted = signal(false);
  protected readonly confirmingDelete = signal(false);

  protected readonly errors = computed(() => {
    const e: { nome?: string; cnpj?: string; meses?: string } = {};
    const { nome, cnpj } = this.info();
    if (!nome.trim()) e.nome = 'Informe o nome da empresa.';
    const digits = cnpj.replace(/\D/g, '');
    if (digits && digits.length !== 14) e.cnpj = 'O CNPJ tem 14 dígitos.';
    const labels = this.meses().map((m) => m.label.trim().toLowerCase());
    if (labels.some((l) => !l)) e.meses = 'Dê um nome a todos os meses.';
    else if (new Set(labels).size !== labels.length) e.meses = 'Há dois meses com o mesmo nome.';
    return e;
  });

  protected readonly totals = computed(() => {
    const filled = this.meses().filter(hasData);
    if (!filled.length) return null;
    const d = sumDre(filled.map(computeDre));
    return { fat: brl(d.faturamentoBruto), lucro: brl(d.lucroLiquido), negative: d.lucroLiquido < 0, months: filled.length };
  });

  protected readonly dragging = signal(false);
  protected readonly importing = signal(false);
  protected readonly imported = signal<{ fileName: string; result: ImportResult } | null>(null);
  private beforeImport: Draft | null = null;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected setText(key: TextField, event: Event): void {
    const value = this.text(event);
    this.info.update((i) => ({ ...i, [key]: value }));
  }

  protected setCnpj(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatCnpj(input.value);
    input.value = formatted;
    this.info.update((i) => ({ ...i, cnpj: formatted }));
  }

  protected setCycle(key: keyof FinancialCycle, event: Event): void {
    const raw = this.text(event).trim();
    const days = raw === '' ? null : Math.round(Number(raw));
    this.ciclo.update((c) => ({ ...c, [key]: days != null && Number.isFinite(days) && days >= 0 ? Math.min(days, 999) : null }));
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.importFile(file);
  }

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.importFile(file);
    input.value = '';
  }

  private async importFile(file: File): Promise<void> {
    if (!/\.(xlsx|xlsm|xls|csv)$/i.test(file.name)) {
      this.ui.toast('Formato não suportado. Use uma planilha .xlsx, .xls ou .csv.');
      return;
    }
    this.importing.set(true);
    try {
      const result = await this.importer.parseFile(file);
      this.beforeImport = this.draft();
      if (result.meses.length) this.meses.set(result.meses);
      this.ciclo.update((c) => ({ ...c, ...result.ciclo }));
      const e = result.empresa;
      this.info.update((i) => ({
        ...i,
        nome: i.nome || e.nome || '',
        cnpj: i.cnpj || (e.cnpj ? formatCnpj(e.cnpj) : ''),
        segmento: i.segmento || e.segmento || '',
        responsavel: i.responsavel || e.responsavel || '',
      }));
      this.imported.set({ fileName: file.name, result });
    } catch {
      this.ui.toast('Não foi possível ler o arquivo. Confira se é uma planilha válida.');
    } finally {
      this.importing.set(false);
    }
  }

  protected undoImport(): void {
    if (this.beforeImport) this.restore(this.beforeImport);
    this.beforeImport = null;
    this.imported.set(null);
  }

  protected importSummary(r: ImportResult): string {
    if (!r.meses.length) return 'nenhum mês encontrado.';
    const months = `${r.meses.length} ${r.meses.length === 1 ? 'mês' : 'meses'} (${r.meses.map((m) => m.label).join(', ')})`;
    const extras = Object.keys(r.ciclo).length ? ', além dos prazos do ciclo financeiro' : '';
    return `${months} e ${r.linhasEncontradas} de 6 linhas do DRE${extras}. Revise abaixo e salve.`;
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.save();
  }

  protected save(): void {
    this.submitted.set(true);
    const e = this.errors();
    if (e.nome || e.cnpj || e.meses) {
      const target = e.nome ? 'f-nome' : e.cnpj ? 'f-cnpj' : 'dre-grid';
      document.getElementById(target)?.focus();
      this.ui.toast('Revise os campos destacados antes de salvar.');
      return;
    }
    const saved = this.store.save({
      id: this.existing()?.id,
      ...this.info(),
      nome: this.info().nome.trim(),
      meses: this.meses(),
      ciclo: this.ciclo(),
    });
    this.baseline.set(this.snapshot());
    this.imported.set(null);
    this.submitted.set(false);
    this.ui.toast(`${saved.nome} salva`);
    if (!this.existing() || this.id() !== saved.id) {
      void this.router.navigate(['/registrations', saved.id], { replaceUrl: true });
    }
  }

  protected discard(): void {
    this.load(this.id());
  }

  protected remove(): void {
    const company = this.existing();
    if (!company) return;
    this.store.remove(company.id);
    this.baseline.set(this.snapshot());
    this.ui.toast(`${company.nome} excluída`);
    void this.router.navigate(['/registrations']);
  }

  protected loadSamples(): void {
    const added = this.store.loadSamples();
    this.ui.toast(added ? `${added} empresas de exemplo carregadas` : 'As empresas de exemplo já estão na lista');
  }

  protected monthsText(c: Company): string {
    const n = c.meses.filter(hasData).length;
    return n === 0 ? 'Sem fluxo de caixa' : `${n} ${n === 1 ? 'mês' : 'meses'} lançados`;
  }

  protected updatedText(c: Company): string {
    return `Atualizada em ${new Date(c.atualizadoEm).toLocaleDateString('pt-BR')}`;
  }

  private load(id: string | undefined): void {
    const company = this.store.byId(id);
    if (id && !company) {
      this.ui.toast('Empresa não encontrada');
      void this.router.navigate(['/registrations'], { replaceUrl: true });
      return;
    }
    this.restore(
      company
        ? {
            info: pickInfo(company),
            meses: structuredClone(company.meses),
            ciclo: { ...company.ciclo },
          }
        : { info: emptyInfo(), meses: recentMonthLabels(3).map(emptyMonth), ciclo: emptyCycle() },
    );
    this.baseline.set(this.snapshot());
    this.imported.set(null);
    this.beforeImport = null;
    this.submitted.set(false);
    this.confirmingDelete.set(false);
  }

  private draft(): Draft {
    return { info: this.info(), meses: this.meses(), ciclo: this.ciclo() };
  }

  private restore(d: Draft): void {
    this.info.set(d.info);
    this.meses.set(d.meses);
    this.ciclo.set(d.ciclo);
  }
}

function pickInfo(c: Company): CompanyInfo {
  const { nome, cnpj, segmento, responsavel } = c;
  return { nome, cnpj, segmento, responsavel };
}

function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
