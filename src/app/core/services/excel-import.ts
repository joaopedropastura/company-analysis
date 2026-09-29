import { Injectable } from '@angular/core';
import { MONTHS_PT, monthLabelFromDate, normalizeLabel, parseNumberBR, brl } from '../format';
import { computeCycle, computeDre } from '../finance/finance';
import {
  CompanyInfo,
  DRE_INPUT_KEYS,
  DRE_LINES,
  DreLineKey,
  emptyMonth,
  FinancialCycle,
  MonthEntry,
} from '../models/company';

export interface SheetRows {
  name: string;
  rows: unknown[][];
}

export interface ImportResult {
  sheetName: string | null;
  meses: MonthEntry[];
  ciclo: Partial<FinancialCycle>;
  empresa: Partial<Pick<CompanyInfo, 'nome' | 'cnpj' | 'segmento' | 'responsavel'>>;
  linhasEncontradas: number;
  temValores: boolean;
  avisos: string[];
}

const DRE_MATCHERS: readonly [DreLineKey, RegExp][] = [
  ['margemContribuicao', /\bmargem de contribuicao\b/],
  ['receitaLiquida', /\breceita liquida\b/],
  ['resultadoOperacional', /\bresultado operacional\b|\bebitda\b/],
  ['lucroLiquido', /\blucro\b|\bprejuizo\b|\bresultado liquido\b/],
  ['despesasFinanceiras', /\bdespesas? financeiras?\b|\bjuros\b|\btarifas?\b/],
  ['custosVariaveis', /\bcustos? variave|\bcmv\b|\bfornecedores?\b/],
  ['custosFixos', /\bcustos? fixos?\b|\bdespesas? fixas?\b/],
  ['folha', /\bfolha\b|\bpro ?l[ao]bore\b|\bsalarios?\b/],
  ['deducoes', /\bdeduc|\bimpostos?\b/],
  ['faturamentoBruto', /\bfaturamento\b|\breceita bruta\b|\bvendas\b/],
];

const CYCLE_MATCHERS: readonly [keyof FinancialCycle, RegExp][] = [
  ['pme', /^pme\b|prazo medio de estoc/],
  ['pmr', /^pmr\b|prazo medio de receb/],
  ['pmp', /^pmp\b|prazo medio de pagam/],
];

const CYCLE_TOTAL_MATCHERS: readonly ['operacional' | 'financeiro', RegExp][] = [
  ['operacional', /^ciclo operacional/],
  ['financeiro', /^ciclo financeiro/],
];

const INFO_MATCHERS: readonly [keyof ImportResult['empresa'], RegExp][] = [
  ['nome', /^(empresa|nome da empresa|razao social|cliente)$/],
  ['cnpj', /^cnpj$/],
  ['segmento', /^(segmento|setor|ramo)$/],
  ['responsavel', /^(responsavel|ceo|contato|socio)$/],
];

const HEADER_WORDS = new Set(['mes', 'meses', 'categoria', 'categoria financeiro', 'linha', 'descricao', 'conta', 'item']);
const MONTH_LIKE = new RegExp(`^(${MONTHS_PT.join('|')})|^m[eê]s\\s*\\d+`, 'i');

interface LabeledRow {
  labelIndex: number;
  label: string;
  cells: unknown[];
}

function labeled(row: unknown[]): LabeledRow | null {
  const labelIndex = row.findIndex((c) => typeof c === 'string' && /[a-zA-ZÀ-ú]/.test(c));
  if (labelIndex < 0) return null;
  return { labelIndex, label: normalizeLabel(String(row[labelIndex])), cells: row };
}

function isMonthLike(cell: unknown): boolean {
  if (cell instanceof Date) return true;
  if (typeof cell === 'string') return MONTH_LIKE.test(normalizeLabel(cell));
  return false;
}

function monthLabel(cell: unknown, index: number): string {
  if (cell instanceof Date) return monthLabelFromDate(cell);
  if (typeof cell === 'number' && cell > 20000) {
    return monthLabelFromDate(new Date(Math.round((cell - 25569) * 86400 * 1000)));
  }
  if (typeof cell === 'number' && cell >= 1 && cell <= 12) return MONTHS_PT[cell - 1];
  const text = cell == null ? '' : String(cell).trim();
  return text || `Mês ${index + 1}`;
}

function firstValueAfter(row: LabeledRow): unknown {
  for (let i = row.labelIndex + 1; i < row.cells.length; i++) {
    const c = row.cells[i];
    if (c != null && String(c).trim() !== '') return c;
  }
  return null;
}

interface DreBlock {
  sheet: string;
  rows: Map<DreLineKey, LabeledRow>;
  columns: number[];
  headers: Map<number, unknown>;
}

function findDreBlock(sheet: SheetRows): DreBlock | null {
  const rows = new Map<DreLineKey, LabeledRow>();
  let firstDreRow = -1;
  let labelIndex = 0;

  sheet.rows.forEach((raw, r) => {
    const row = labeled(raw);
    if (!row) return;
    const match = DRE_MATCHERS.find(([key, re]) => !rows.has(key) && re.test(row.label));
    if (!match) return;
    rows.set(match[0], row);
    if (firstDreRow < 0) {
      firstDreRow = r;
      labelIndex = row.labelIndex;
    }
  });
  if (rows.size < 3) return null;

  let header: unknown[] | null = null;
  for (let r = firstDreRow - 1; r >= 0; r--) {
    const raw = sheet.rows[r] ?? [];
    const row = labeled(raw);
    const first = row ? row.label : '';
    const monthCells = raw.slice(labelIndex + 1).filter(isMonthLike).length;
    if (HEADER_WORDS.has(first) || monthCells > 0) {
      header = raw;
      break;
    }
  }

  const width = Math.max(header?.length ?? 0, ...[...rows.values()].map((r) => r.cells.length));
  const headers = new Map<number, unknown>();
  const columns: number[] = [];
  for (let c = labelIndex + 1; c < width; c++) {
    const head = header?.[c];
    const hasNumber = [...rows.values()].some((r) => typeof parseNumberBR(r.cells[c]) === 'number');
    if (isMonthLike(head) || (typeof head === 'number' && head > 0) || hasNumber) {
      columns.push(c);
      headers.set(c, head ?? null);
    }
  }
  return { sheet: sheet.name, rows, columns, headers };
}

export function parseWorkbookRows(sheets: readonly SheetRows[]): ImportResult {
  const avisos: string[] = [];
  const blocks = sheets.map(findDreBlock).filter((b): b is DreBlock => b != null);
  const block = blocks.sort((a, b) => b.rows.size - a.rows.size)[0] ?? null;

  const meses: MonthEntry[] = [];
  let temValores = false;

  if (!block) {
    avisos.push('Não encontramos as linhas do fluxo de caixa (faturamento, custos, folha...). Confira se a planilha segue o modelo.');
  } else {
    block.columns.forEach((col, i) => {
      const month = emptyMonth(monthLabel(block.headers.get(col), i));
      for (const key of DRE_INPUT_KEYS) {
        const value = parseNumberBR(block.rows.get(key)?.cells[col]);
        month[key] = value == null ? null : key === 'faturamentoBruto' ? value : Math.abs(value);
        if (value != null) temValores = true;
      }
      meses.push(month);
    });

    const missing = DRE_LINES.filter((l) => l.kind === 'input' && !block.rows.has(l.key)).map((l) => l.label);
    if (missing.length) avisos.push(`Linhas não encontradas, preencha à mão: ${missing.join(', ')}.`);
    if (!block.columns.length) avisos.push('Não encontramos colunas de meses na planilha.');
    else if (!temValores) avisos.push('A planilha não tem valores preenchidos. Criamos os meses em branco para você completar.');

    for (const line of DRE_LINES) {
      if (line.kind !== 'total') continue;
      const row = block.rows.get(line.key);
      if (!row) continue;
      block.columns.forEach((col, i) => {
        const informed = parseNumberBR(row.cells[col]);
        if (informed == null) return;
        const calculated = computeDre(meses[i])[line.key];
        const tolerance = Math.max(1, Math.abs(calculated) * 0.005);
        if (Math.abs(informed - calculated) > tolerance) {
          avisos.push(
            `${line.label} de ${meses[i].label}: a planilha diz ${brl(informed)}, o cálculo dá ${brl(calculated)}. Usamos o cálculo.`,
          );
        }
      });
    }
  }

  const ciclo: Partial<FinancialCycle> = {};
  const cicloInformado: Partial<Record<'operacional' | 'financeiro', number>> = {};
  const empresa: ImportResult['empresa'] = {};
  for (const sheet of sheets) {
    for (const raw of sheet.rows) {
      const row = labeled(raw);
      if (!row) continue;
      const value = firstValueAfter(row);
      if (value == null) continue;

      const cycle = CYCLE_MATCHERS.find(([key, re]) => ciclo[key] === undefined && re.test(row.label));
      if (cycle) {
        const days = parseNumberBR(value);
        if (days != null && days >= 0) ciclo[cycle[0]] = Math.round(days);
        continue;
      }
      const total = CYCLE_TOTAL_MATCHERS.find(([key, re]) => cicloInformado[key] === undefined && re.test(row.label));
      if (total) {
        const days = parseNumberBR(value);
        if (days != null) cicloInformado[total[0]] = days;
        continue;
      }
      const info = INFO_MATCHERS.find(([key, re]) => empresa[key] === undefined && re.test(row.label));
      if (info && typeof value === 'string') empresa[info[0]] = value.trim();
    }
  }

  const calculado = computeCycle({ pme: null, pmr: null, pmp: null, ...ciclo });
  for (const [key, label] of [
    ['operacional', 'Ciclo operacional'],
    ['financeiro', 'Ciclo financeiro'],
  ] as const) {
    const informado = cicloInformado[key];
    const conta = calculado[key];
    if (informado != null && conta != null && informado !== conta) {
      avisos.push(`${label}: a planilha diz ${informado} dias, o cálculo dá ${conta}. Usamos o cálculo.`);
    }
  }

  return {
    sheetName: block?.sheet ?? null,
    meses,
    ciclo,
    empresa,
    linhasEncontradas: block ? [...block.rows.keys()].filter((k) => (DRE_INPUT_KEYS as readonly string[]).includes(k)).length : 0,
    temValores,
    avisos,
  };
}

@Injectable({ providedIn: 'root' })
export class ExcelImporter {
  async parseFile(file: File): Promise<ImportResult> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheets: SheetRows[] = workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: true, defval: null }),
    }));
    return parseWorkbookRows(sheets);
  }
}
