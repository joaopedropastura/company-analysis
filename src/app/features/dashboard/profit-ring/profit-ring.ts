import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { brlCompact, pct } from '../../../core/format';

const RADIUS = 64;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

@Component({
  selector: 'app-profit-ring',
  template: `
    @if (model(); as m) {
      <div class="ring" role="img" [attr.aria-label]="m.aria">
        <svg viewBox="8 8 144 144" aria-hidden="true">
          <circle class="ring__track" [class.is-loss]="m.loss" cx="80" cy="80" [attr.r]="radius" />
          <circle
            class="ring__arc"
            [class.is-loss]="m.loss"
            cx="80"
            cy="80"
            [attr.r]="radius"
            [attr.stroke-dasharray]="m.dash + ' ' + circumference"
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div class="ring__center" aria-hidden="true">
          <span class="ring__value">{{ m.pct }}</span>
          <span class="ring__label">{{ m.loss ? 'de prejuízo' : 'vira lucro' }}</span>
        </div>
      </div>
    } @else {
      <p class="ring__empty">Sem faturamento no período.</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .ring {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    circle {
      fill: none;
      stroke-width: 16;
    }
    .ring__track {
      stroke: color-mix(in srgb, var(--viz-result) 16%, transparent);
    }
    .ring__arc {
      stroke: var(--viz-result);
      transition: stroke-dasharray 400ms ease;
    }
    .ring__track.is-loss {
      stroke: color-mix(in srgb, var(--viz-out) 16%, transparent);
    }
    .ring__arc.is-loss {
      stroke: var(--viz-out);
    }
    .ring__center {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      text-align: center;
    }
    .ring__value {
      font-size: 1.875rem;
      font-weight: 650;
      font-stretch: 108%;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .ring__label {
      font-size: var(--fs-sm);
      color: var(--ink-2);
    }
    .ring__empty {
      font-size: var(--fs-sm);
      color: var(--ink-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfitRing {
  readonly faturamento = input.required<number>();
  readonly lucro = input.required<number>();

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly model = computed(() => {
    const fat = this.faturamento();
    const lucro = this.lucro();
    if (fat <= 0) return null;
    const ratio = lucro / fat;
    const loss = ratio < 0;
    const share = pct(Math.abs(ratio));
    const caption = loss
      ? `Prejuízo de ${brlCompact(-lucro)} sobre ${brlCompact(fat)} faturados.`
      : `${brlCompact(lucro)} de lucro sobre ${brlCompact(fat)} faturados.`;
    return {
      loss,
      pct: share,
      dash: Math.min(Math.abs(ratio), 1) * CIRCUMFERENCE,
      caption,
      aria: `${share} do faturamento ${loss ? 'de prejuízo' : 'virou lucro'}. ${caption}`,
    };
  });
}
