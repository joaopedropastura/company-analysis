export const DRE_INPUT_KEYS = [
  'faturamentoBruto',
  'deducoes',
  'custosVariaveis',
  'custosFixos',
  'folha',
  'despesasFinanceiras',
] as const;
export type DreInputKey = (typeof DRE_INPUT_KEYS)[number];

export const DRE_TOTAL_KEYS = [
  'receitaLiquida',
  'margemContribuicao',
  'resultadoOperacional',
  'lucroLiquido',
] as const;
export type DreTotalKey = (typeof DRE_TOTAL_KEYS)[number];

export type DreLineKey = DreInputKey | DreTotalKey;

export type MonthEntry = { id: string; label: string } & Record<DreInputKey, number | null>;

export interface FinancialCycle {
  pme: number | null;
  pmr: number | null;
  pmp: number | null;
}

export interface CompanyInfo {
  nome: string;
  cnpj: string;
  segmento: string;
  responsavel: string;
}

export interface Company extends CompanyInfo {
  id: string;
  meses: MonthEntry[];
  ciclo: FinancialCycle;
  criadoEm: string;
  atualizadoEm: string;
}

interface DreLineBase {
  label: string;
  short: string;
  hint: string;
}
export type DreLineDef =
  | (DreLineBase & { key: DreInputKey; kind: 'input'; sign: '+' | '−' })
  | (DreLineBase & { key: DreTotalKey; kind: 'total'; sign: '=' });

export const DRE_LINES: readonly DreLineDef[] = [
  {
    key: 'faturamentoBruto',
    kind: 'input',
    sign: '+',
    label: 'Faturamento bruto',
    short: 'Faturamento',
    hint: 'Volume total de vendas que entrou no caixa.',
  },
  {
    key: 'deducoes',
    kind: 'input',
    sign: '−',
    label: 'Deduções e impostos',
    short: 'Impostos',
    hint: 'O imposto está condizente com a nota emitida?',
  },
  {
    key: 'receitaLiquida',
    kind: 'total',
    sign: '=',
    label: 'Receita líquida',
    short: 'Receita líquida',
    hint: 'O dinheiro real disponível para a operação.',
  },
  {
    key: 'custosVariaveis',
    kind: 'input',
    sign: '−',
    label: 'Custos variáveis (fornecedores/CMV)',
    short: 'Custos variáveis',
    hint: 'O custo do produto está engolindo o caixa?',
  },
  {
    key: 'margemContribuicao',
    kind: 'total',
    sign: '=',
    label: 'Margem de contribuição',
    short: 'Margem contrib.',
    hint: 'Quanto sobra para pagar a estrutura fixa.',
  },
  {
    key: 'custosFixos',
    kind: 'input',
    sign: '−',
    label: 'Custos fixos (aluguel, sistemas etc.)',
    short: 'Custos fixos',
    hint: 'A estrutura da empresa está pesada demais?',
  },
  {
    key: 'folha',
    kind: 'input',
    sign: '−',
    label: 'Folha de pagamento e pró-labore',
    short: 'Folha e pró-labore',
    hint: 'O pró-labore do dono está acima do mercado?',
  },
  {
    key: 'resultadoOperacional',
    kind: 'total',
    sign: '=',
    label: 'Resultado operacional',
    short: 'Resultado operac.',
    hint: 'A operação da empresa se paga sozinha?',
  },
  {
    key: 'despesasFinanceiras',
    kind: 'input',
    sign: '−',
    label: 'Despesas financeiras (juros/tarifas)',
    short: 'Juros e tarifas',
    hint: 'Ralo financeiro: juros de antecipação e banco.',
  },
  {
    key: 'lucroLiquido',
    kind: 'total',
    sign: '=',
    label: 'Lucro/prejuízo líquido',
    short: 'Lucro líquido',
    hint: 'Sobrou ou faltou dinheiro no mês?',
  },
];

export type CycleTotalKey = 'operacional' | 'financeiro';

export type CycleRowDef =
  | { key: keyof FinancialCycle; kind: 'input'; sign: '+' | '−'; label: string; hint: string }
  | { key: CycleTotalKey; kind: 'total'; sign: '='; label: string; hint: string };

export const CYCLE_ROWS: readonly CycleRowDef[] = [
  {
    key: 'pme',
    kind: 'input',
    sign: '+',
    label: 'Prazo médio de estocagem (PME)',
    hint: 'Tempo médio que o produto fica parado antes de ser vendido.',
  },
  {
    key: 'pmr',
    kind: 'input',
    sign: '+',
    label: 'Prazo médio de recebimento (PMR)',
    hint: 'Tempo médio que leva para o dinheiro do cliente cair na conta.',
  },
  {
    key: 'operacional',
    kind: 'total',
    sign: '=',
    label: 'Ciclo operacional',
    hint: 'Tempo total desde a compra do insumo até o recebimento da venda.',
  },
  {
    key: 'pmp',
    kind: 'input',
    sign: '−',
    label: 'Prazo médio de pagamento (PMP)',
    hint: 'Tempo médio que a empresa tem para pagar seus fornecedores.',
  },
  {
    key: 'financeiro',
    kind: 'total',
    sign: '=',
    label: 'Ciclo financeiro (necessidade de giro)',
    hint: 'Fórmula de ouro: dias que a empresa passa financiada por bancos ou capital próprio.',
  },
];

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyMonth(label: string): MonthEntry {
  return {
    id: newId(),
    label,
    faturamentoBruto: null,
    deducoes: null,
    custosVariaveis: null,
    custosFixos: null,
    folha: null,
    despesasFinanceiras: null,
  };
}

export function emptyCycle(): FinancialCycle {
  return { pme: null, pmr: null, pmp: null };
}

export function emptyInfo(): CompanyInfo {
  return {
    nome: '',
    cnpj: '',
    segmento: '',
    responsavel: '',
  };
}
