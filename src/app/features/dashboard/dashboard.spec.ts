import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CompanyStore } from '../../core/services/company-store';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    localStorage.removeItem('raiox.empresas.v1');
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Dashboard);
  });

  afterEach(() => localStorage.removeItem('raiox.empresas.v1'));

  it('convida a cadastrar a primeira empresa quando a carteira está vazia', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Comece pela primeira empresa');
  });

  it('mostra a rentabilidade, os indicadores, o anel, o ciclo e a carteira da empresa selecionada', () => {
    TestBed.inject(CompanyStore).loadSamples();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect([...el.querySelectorAll('.indicator__label')].map((k) => k.textContent)).toEqual([
      'Margem bruta',
      'Margem EBITDA',
      'Margem líquida',
    ]);
    expect([...el.querySelectorAll('.kpi__label')].map((k) => k.textContent)).toEqual([
      'Custos fixos',
      'Custos variáveis',
      'Ponto de equilíbrio',
      'Juros e tarifas',
    ]);
    expect(el.querySelector('.ring-panel .ring__value')?.textContent).toMatch(/%$/);
    expect(el.querySelectorAll('.cycle tbody tr').length).toBe(5);
    expect(el.querySelectorAll('.client').length).toBe(4);
  });
});
