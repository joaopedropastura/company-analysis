import { computed, Injectable, signal } from '@angular/core';
import { sampleCompanies } from '../data/sample-companies';
import {
  Company,
  CompanyInfo,
  DRE_INPUT_KEYS,
  emptyCycle,
  emptyInfo,
  FinancialCycle,
  MonthEntry,
  newId,
} from '../models/company';

const STORAGE_KEY = 'raiox.empresas.v1';

@Injectable({ providedIn: 'root' })
export class CompanyStore {
  private readonly items = signal<Company[]>(this.read());

  readonly companies = computed(() =>
    [...this.items()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
  );

  byId(id: string | null | undefined): Company | undefined {
    return id ? this.items().find((c) => c.id === id) : undefined;
  }

  save(company: Omit<Company, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }): Company {
    const now = new Date().toISOString();
    const existing = this.byId(company.id);
    const saved: Company = {
      ...company,
      id: existing?.id ?? newId(),
      criadoEm: existing?.criadoEm ?? now,
      atualizadoEm: now,
    };
    this.items.update((list) => (existing ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved]));
    this.write();
    return saved;
  }

  remove(id: string): void {
    this.items.update((list) => list.filter((c) => c.id !== id));
    this.write();
  }

  loadSamples(): number {
    const names = new Set(this.items().map((c) => c.nome));
    const fresh = sampleCompanies().filter((c) => !names.has(c.nome));
    if (fresh.length) {
      this.items.update((list) => [...list, ...fresh]);
      this.write();
    }
    return fresh.length;
  }

  private read(): Company[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(normalize).filter((c): c is Company => c != null) : [];
    } catch {
      return [];
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
    } catch {
    }
  }
}

function normalize(value: unknown): Company | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<Company>;
  if (typeof v.id !== 'string' || typeof v.nome !== 'string') return null;

  const meses: MonthEntry[] = Array.isArray(v.meses)
    ? v.meses.map((m, i) => {
        const month = { id: typeof m?.id === 'string' ? m.id : newId(), label: String(m?.label ?? `Mês ${i + 1}`) } as MonthEntry;
        for (const k of DRE_INPUT_KEYS) month[k] = typeof m?.[k] === 'number' ? m[k] : null;
        return month;
      })
    : [];

  const now = new Date().toISOString();
  return {
    ...knownInfo(v),
    id: v.id,
    meses,
    ciclo: knownCycle(v.ciclo),
    criadoEm: v.criadoEm ?? now,
    atualizadoEm: v.atualizadoEm ?? now,
  };
}

function knownCycle(value: Partial<FinancialCycle> | undefined): FinancialCycle {
  const ciclo = emptyCycle();
  for (const k of Object.keys(ciclo) as (keyof FinancialCycle)[]) {
    const days = value?.[k];
    ciclo[k] = typeof days === 'number' && days >= 0 ? days : null;
  }
  return ciclo;
}

function knownInfo(v: Partial<Company>): CompanyInfo {
  const info = emptyInfo();
  const copy = <K extends keyof CompanyInfo>(key: K) => {
    const value = v[key];
    if (value !== undefined) info[key] = value as CompanyInfo[K];
  };
  (Object.keys(info) as (keyof CompanyInfo)[]).forEach(copy);
  return info;
}
