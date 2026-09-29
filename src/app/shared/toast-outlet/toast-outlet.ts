import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiState } from '../../core/services/ui-state';

@Component({
  selector: 'app-toast-outlet',
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (t of ui.toasts(); track t.id) {
        <p class="toast">{{ t.text }}</p>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      inset: auto 16px 20px;
      display: grid;
      justify-items: center;
      gap: 8px;
      pointer-events: none;
      z-index: 50;
    }
    .toast {
      margin: 0;
      padding: 10px 16px;
      border-radius: 8px;
      background: var(--ink);
      color: var(--sheet);
      font-size: 14px;
      font-weight: 600;
      box-shadow: var(--shadow-pop);
      animation: toast-in 180ms ease-out;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(6px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast { animation: none; }
    }
    :host-context(.is-printing) .toasts { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet {
  protected readonly ui = inject(UiState);
}
