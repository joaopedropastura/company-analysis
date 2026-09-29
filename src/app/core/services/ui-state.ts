import { ApplicationRef, inject, Injectable, signal } from '@angular/core';
import { ThemeService } from './theme';

export interface Toast {
  id: number;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class UiState {
  private readonly theme = inject(ThemeService);
  private readonly appRef = inject(ApplicationRef);

  readonly presenting = signal(false);
  readonly printing = signal(false);
  readonly toasts = signal<Toast[]>([]);
  private nextToast = 1;

  constructor() {
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.presenting()) this.presenting.set(false);
    });
    window.addEventListener('beforeprint', () => this.enterPrintMode());
    window.addEventListener('afterprint', () => this.exitPrintMode());
  }

  exportPdf(fileName: string): void {
    const previousTitle = document.title;
    document.title = fileName;
    window.addEventListener('afterprint', () => (document.title = previousTitle), { once: true });
    this.enterPrintMode();
    window.print();
  }

  private enterPrintMode(): void {
    if (this.printing()) return;
    this.theme.force('light');
    document.documentElement.classList.add('is-printing');
    this.printing.set(true);
    this.appRef.tick();
  }

  private exitPrintMode(): void {
    if (!this.printing()) return;
    this.theme.force(null);
    document.documentElement.classList.remove('is-printing');
    this.printing.set(false);
  }

  startPresentation(): void {
    this.presenting.set(true);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  stopPresentation(): void {
    this.presenting.set(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }

  toast(text: string): void {
    const id = this.nextToast++;
    this.toasts.update((list) => [...list, { id, text }]);
    setTimeout(() => this.toasts.update((list) => list.filter((t) => t.id !== id)), 3600);
  }
}
