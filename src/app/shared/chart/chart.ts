import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { UiState } from '../../core/services/ui-state';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);
Chart.defaults.font.family = "'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif";
Chart.defaults.font.size = 12;

export type BarChartConfig = ChartConfiguration<'bar', (number | [number, number] | null)[], string>;
export type LineChartConfig = ChartConfiguration<'line', (number | null)[], string>;
export type AnyChartConfig = BarChartConfig | LineChartConfig;

@Component({
  selector: 'app-chart',
  template: `<canvas #canvas role="img" [attr.aria-label]="label()"></canvas>`,
  styles: `
    :host { display: block; position: relative; width: 100%; height: 100%; }
    canvas { display: block; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCanvas {
  readonly config = input.required<AnyChartConfig>();
  readonly label = input('');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    afterRenderEffect(() => {
      const config = this.config();
      const el = this.canvas().nativeElement;
      untracked(() => this.draw(el, config));
    });
    const ui = inject(UiState);
    afterRenderEffect(() => {
      ui.printing();
      untracked(() => this.chart?.resize());
    });
    document.fonts?.ready.then(() => this.chart?.update('none'));
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  private draw(el: HTMLCanvasElement, config: AnyChartConfig): void {
    this.chart?.destroy();
    const options = {
      ...config.options,
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    };
    this.chart = new Chart(el, { ...config, options } as unknown as ChartConfiguration);
  }
}
