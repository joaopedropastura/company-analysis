import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CompanyStore } from '../../core/services/company-store';
import { Registrations } from './registrations';

describe('Registrations', () => {
  let fixture: ComponentFixture<Registrations>;

  beforeEach(async () => {
    localStorage.removeItem('raiox.empresas.v1');
    await TestBed.configureTestingModule({
      imports: [Registrations],
      providers: [provideRouter([{ path: 'registrations/:id', component: Registrations }])],
    }).compileComponents();
    fixture = TestBed.createComponent(Registrations);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('raiox.empresas.v1'));

  it('começa uma empresa nova com três meses em branco', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Nova empresa');
    expect(el.querySelectorAll('.month-input').length).toBe(3);
  });

  it('calcula o ciclo operacional e o financeiro enquanto os prazos são digitados', () => {
    const el = fixture.nativeElement as HTMLElement;
    const type = (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`#f-${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('pme', '30');
    type('pmr', '45');
    type('pmp', '15');
    fixture.detectChanges();
    expect([...el.querySelectorAll('.cycle-table output')].map((o) => o.textContent)).toEqual(['75', '60']);
  });

  it('não salva sem o nome da empresa', () => {
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('#e-nome')?.textContent).toContain('Informe o nome');
    expect(TestBed.inject(CompanyStore).companies().length).toBe(0);
  });

  it('salva a empresa digitada', () => {
    const el = fixture.nativeElement as HTMLElement;
    const nome = el.querySelector<HTMLInputElement>('#f-nome')!;
    nome.value = 'Padaria Teste';
    nome.dispatchEvent(new Event('input'));
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();
    const saved = TestBed.inject(CompanyStore).companies();
    expect(saved.map((c) => c.nome)).toEqual(['Padaria Teste']);
    expect(saved[0].meses.length).toBe(3);
  });
});
