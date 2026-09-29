import { computed, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'raiox.tema';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly choice = signal<Theme | null>(readChoice());
  private readonly forced = signal<Theme | null>(null);

  readonly theme = computed<Theme>(() => this.forced() ?? this.choice() ?? 'light');

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
    }
    this.choice.set(next);
  }

  force(theme: Theme | null): void {
    const effective = theme ?? this.choice();
    if (effective) document.documentElement.setAttribute('data-theme', effective);
    else document.documentElement.removeAttribute('data-theme');
    this.forced.set(theme);
  }
}

function readChoice(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}
