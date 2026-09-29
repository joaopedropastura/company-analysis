import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';
import { UiState } from './ui-state';

describe('UiState', () => {
  let ui: UiState;
  let print: jasmine.Spy;

  beforeEach(() => {
    ui = TestBed.inject(UiState);
    print = spyOn(window, 'print');
    document.title = 'A SOARES ADMIN';
  });

  afterEach(() => window.dispatchEvent(new Event('afterprint')));

  it('exporta em PDF pelo layout de relatório claro e restaura tudo ao fechar a impressão', () => {
    const root = document.documentElement;
    ui.exportPdf('A SOARES ADMIN - Padaria - Acumulado de jan a mar');

    expect(print).toHaveBeenCalledTimes(1);
    expect(ui.printing()).toBeTrue();
    expect(root.classList).toContain('is-printing');
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
    expect(document.title).toBe('A SOARES ADMIN - Padaria - Acumulado de jan a mar');

    window.dispatchEvent(new Event('afterprint'));

    expect(ui.printing()).toBeFalse();
    expect(root.classList).not.toContain('is-printing');
    expect(document.title).toBe('A SOARES ADMIN');
  });

  it('usa o mesmo layout quando a pessoa imprime com Ctrl+P', () => {
    window.dispatchEvent(new Event('beforeprint'));
    expect(ui.printing()).toBeTrue();
    window.dispatchEvent(new Event('afterprint'));
    expect(ui.printing()).toBeFalse();
  });
});
