import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, model } from '@angular/core';
import { computeDre, hasData, sumDre } from '../../../core/finance/finance';
import { nextMonthLabel, num, parseNumberBR, recentMonthLabels } from '../../../core/format';
import { DRE_LINES, DreInputKey, emptyMonth, MonthEntry } from '../../../core/models/company';
import { MoneyInput } from '../../../shared/money-input/money-input';

@Component({
  selector: 'app-dre-grid',
  imports: [MoneyInput],
  templateUrl: './dre-grid.html',
  styleUrl: './dre-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DreGrid {
  readonly months = model.required<MonthEntry[]>();
  readonly invalid = input(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly lines = DRE_LINES;
  protected readonly results = computed(() => this.months().map(computeDre));
  protected readonly total = computed(() => sumDre(this.results()));
  protected readonly fmt = num;

  protected setValue(id: string, key: DreInputKey, value: number | null): void {
    this.months.update((ms) => ms.map((m) => (m.id === id ? { ...m, [key]: value } : m)));
  }

  protected rename(id: string, event: Event): void {
    const label = (event.target as HTMLInputElement).value.trim();
    this.months.update((ms) => ms.map((m) => (m.id === id ? { ...m, label } : m)));
  }

  protected addMonth(): void {
    const ms = this.months();
    const last = ms[ms.length - 1];
    const label = last ? nextMonthLabel(last.label, ms.length) : recentMonthLabels(1)[0];
    this.months.set([...ms, emptyMonth(label)]);
    setTimeout(() => this.focusCell(0, ms.length));
  }

  protected removeMonth(month: MonthEntry): void {
    if (hasData(month) && !confirm(`Remover ${month.label || 'este mês'} e os valores lançados nele?`)) return;
    this.months.update((ms) => ms.filter((m) => m.id !== month.id));
  }

  protected onEnter(event: Event): void {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement)) return;
    event.preventDefault();
    if (target.classList.contains('month-input')) {
      target.blur();
      return;
    }
    const pos = this.cellOf(target);
    if (!pos) return;
    const next = this.lines.findIndex((l, i) => i > pos.row && l.kind === 'input');
    if (next > -1) this.focusCell(next, pos.col);
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = (event.clipboardData?.getData('text/plain') ?? '').replace(/\r/g, '').replace(/\n+$/, '');
    if (!/[\t\n]/.test(text)) return;
    const pos = this.cellOf(event.target);
    if (!pos) return;
    event.preventDefault();

    const rows = text.split('\n').map((r) => r.split('\t'));
    const months = [...this.months()];
    const width = pos.col + Math.max(...rows.map((r) => r.length));
    while (months.length < width) {
      const last = months[months.length - 1];
      months.push(emptyMonth(last ? nextMonthLabel(last.label, months.length) : `Mês ${months.length + 1}`));
    }

    rows.forEach((cells, r) => {
      const line = this.lines[pos.row + r];
      if (!line || line.kind !== 'input') return;
      cells.forEach((raw, c) => {
        const value = parseNumberBR(raw);
        const i = pos.col + c;
        months[i] = { ...months[i], [line.key]: value == null || line.key === 'faturamentoBruto' ? value : Math.abs(value) };
      });
    });
    this.months.set(months);
  }

  private cellOf(target: EventTarget | null): { row: number; col: number } | null {
    const cell = (target as HTMLElement | null)?.closest<HTMLElement>('[data-cell]');
    const [row, col] = (cell?.dataset['cell'] ?? '').split(':').map(Number);
    return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null;
  }

  private focusCell(row: number, col: number): void {
    this.host.nativeElement.querySelector<HTMLInputElement>(`[data-cell="${row}:${col}"] input`)?.focus();
  }
}
