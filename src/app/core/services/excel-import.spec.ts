import { parseWorkbookRows } from './excel-import';

const TEMPLATE_ROWS: unknown[][] = [
  ['mes', 'jan', 'fev', 'mar'],
  ['FATURAMENTO BRUTO', null, null, null],
  ['Deduções e Impostos Simples', null, null, null],
  ['RECEITA LÍQUIDA', null, null, null],
  ['Custos Variáveis (Fornecedores/CMV)', null, null, null],
  ['MARGEM DE CONTRIBUIÇÃO', null, null, null],
  ['Custos Fixos (Aluguel, Sistemas, etc.)', null, null, null],
  ['Folha de Pagamento e Pro Lobore', null, null, null],
  ['RESULTADO OPERACIONAL', null, null, null],
  ['Despesas Financeiras (Juros/Tarifas)', null, null, null],
  ['LUCRO/PREJUÍZO LÍQUIDO', null, null, null],
];

describe('parseWorkbookRows', () => {
  it('lê o template vazio criando os meses em branco', () => {
    const r = parseWorkbookRows([{ name: 'Página1', rows: TEMPLATE_ROWS }, { name: 'Página2', rows: [] }]);
    expect(r.sheetName).toBe('Página1');
    expect(r.meses.map((m) => m.label)).toEqual(['jan', 'fev', 'mar']);
    expect(r.linhasEncontradas).toBe(6);
    expect(r.temValores).toBeFalse();
    expect(r.avisos.join(' ')).toContain('não tem valores');
  });

  it('lê valores em texto, saídas negativas e confere os totais da planilha', () => {
    const rows = TEMPLATE_ROWS.map((r) => [...r]);
    rows[1] = ['FATURAMENTO BRUTO', 250000, 'R$ 262.400,00', 271000];
    rows[2] = ['Deduções e Impostos Simples', -15000, -15744, -16260];
    rows[4] = ['Custos Variáveis (Fornecedores/CMV)', 112000, 118080, 121950];
    rows[6] = ['Custos Fixos (Aluguel, Sistemas, etc.)', 38000, 38000, 38500];
    rows[7] = ['Folha de Pagamento e Pro Lobore', 61000, 61000, 62000];
    rows[9] = ['Despesas Financeiras (Juros/Tarifas)', 9000, 9400, 9900];
    rows[10] = ['LUCRO/PREJUÍZO LÍQUIDO', 15000, 20176, 99999];

    const r = parseWorkbookRows([{ name: 'Página1', rows }]);
    expect(r.meses[1].faturamentoBruto).toBe(262400);
    expect(r.meses[0].deducoes).toBe(15000);
    expect(r.temValores).toBeTrue();
    expect(r.avisos.length).toBe(1);
    expect(r.avisos[0]).toContain('mar');
    expect(r.avisos[0]).toContain('22.390');
  });

  it('lê a aba de ciclo financeiro da planilha de diagnóstico e confere os totais', () => {
    const r = parseWorkbookRows([
      { name: '1. Fluxo de Caixa', rows: TEMPLATE_ROWS },
      {
        name: '2. Ciclo Financeiro',
        rows: [
          ['Indicador de Capital de Giro', 'Prazos (Dias)', 'Impacto Técnico Estratégico'],
          ['(+) Prazo Médio de Estocagem (PME)', 30, 'Tempo médio que o produto fica parado antes de ser vendido.'],
          ['(+) Prazo Médio de Recebimento (PMR)', 45, 'Tempo médio que leva para o dinheiro do cliente cair na conta.'],
          ['(=) CICLO OPERACIONAL', 75, 'Tempo total desde a compra do insumo até o recebimento da venda.'],
          ['(-) Prazo Médio de Pagamento (PMP)', 15, 'Tempo médio que a empresa tem para pagar seus fornecedores.'],
          ['(=) CICLO FINANCEIRO (Necessidade de Giro)', 61, 'Fórmula de Ouro: dias financiados por bancos ou capital próprio.'],
        ],
      },
    ]);
    expect(r.sheetName).toBe('1. Fluxo de Caixa');
    expect(r.ciclo).toEqual({ pme: 30, pmr: 45, pmp: 15 });
    expect(r.avisos).toContain('Ciclo financeiro: a planilha diz 61 dias, o cálculo dá 60. Usamos o cálculo.');
    expect(r.avisos.join(' ')).not.toContain('Ciclo operacional');
  });

  it('encontra os dados da empresa em qualquer aba', () => {
    const r = parseWorkbookRows([
      { name: 'DRE', rows: TEMPLATE_ROWS },
      {
        name: 'Extras',
        rows: [
          ['Empresa', 'Distribuidora Horizonte'],
          ['CNPJ', '45678901000123'],
        ],
      },
    ]);
    expect(r.empresa).toEqual({ nome: 'Distribuidora Horizonte', cnpj: '45678901000123' });
  });

  it('aceita o layout do playbook: coluna de número da linha e coluna de comentários', () => {
    const rows: unknown[][] = [
      ['Linha', 'Categoria Financeiro', 'Mês 1', 'Mês 2', 'Mês 3', 'O que analisar'],
      [1, '(+) FATURAMENTO BRUTO', 100, 110, 120, 'Volume total de vendas.'],
      [2, '(-) Deduções e Impostos Simples', 10, 11, 12, 'O imposto está condizente?'],
      [4, '(-) Custos Variáveis (Fornecedores/CMV)', 40, 44, 48, 'O custo está engolindo o caixa?'],
      [6, '(-) Custos Fixos (Aluguel, Sistemas, etc.)', 20, 20, 20, 'A estrutura está pesada?'],
      [7, '(-) Folha de Pagamento e Pró-labore', 15, 15, 15, ''],
      [9, '(-) Despesas Financeiras (Juros/Tarifas)', 5, 5, 5, ''],
    ];
    const r = parseWorkbookRows([{ name: 'Aba 1', rows }]);
    expect(r.meses.map((m) => m.label)).toEqual(['Mês 1', 'Mês 2', 'Mês 3']);
    expect(r.meses[2].faturamentoBruto).toBe(120);
    expect(r.meses[0].folha).toBe(15);
  });

  it('avisa quando a planilha não tem o fluxo de caixa', () => {
    const r = parseWorkbookRows([{ name: 'Qualquer', rows: [['nome', 'valor']] }]);
    expect(r.meses).toEqual([]);
    expect(r.avisos[0]).toContain('Não encontramos');
  });
});
