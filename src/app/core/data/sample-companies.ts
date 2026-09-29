import { Company, DreInputKey, MonthEntry, newId } from '../models/company';

type Row = Record<DreInputKey, number>;

function months(labels: string[], rows: Row[]): MonthEntry[] {
  return rows.map((row, i) => ({ id: newId(), label: labels[i], ...row }));
}

export function sampleCompanies(): Company[] {
  const now = new Date().toISOString();
  const labels = ['jun/26', 'jul/26', 'ago/26'];

  return [
    {
      id: newId(),
      nome: 'Padaria Pão Nobre',
      cnpj: '12.345.678/0001-90',
      segmento: 'Varejo alimentício',
      responsavel: 'Marta Oliveira',
      meses: months(labels, [
        { faturamentoBruto: 182000, deducoes: 12740, custosVariaveis: 78260, custosFixos: 24500, folha: 41000, despesasFinanceiras: 9800 },
        { faturamentoBruto: 175500, deducoes: 12285, custosVariaveis: 77220, custosFixos: 24500, folha: 41000, despesasFinanceiras: 11200 },
        { faturamentoBruto: 191200, deducoes: 13384, custosVariaveis: 80304, custosFixos: 25100, folha: 42200, despesasFinanceiras: 12900 },
      ]),
      ciclo: { pme: 12, pmr: 28, pmp: 21 },
      criadoEm: now,
      atualizadoEm: now,
    },
    {
      id: newId(),
      nome: 'Metalúrgica Vale do Aço',
      cnpj: '23.456.789/0001-01',
      segmento: 'Indústria metalúrgica',
      responsavel: 'Ricardo Albuquerque',
      meses: months(labels, [
        { faturamentoBruto: 1240000, deducoes: 142600, custosVariaveis: 644800, custosFixos: 168000, folha: 214000, despesasFinanceiras: 58000 },
        { faturamentoBruto: 1185000, deducoes: 136275, custosVariaveis: 628050, custosFixos: 171000, folha: 214000, despesasFinanceiras: 61500 },
        { faturamentoBruto: 1098000, deducoes: 126270, custosVariaveis: 603900, custosFixos: 172500, folha: 218000, despesasFinanceiras: 66800 },
      ]),
      ciclo: { pme: 45, pmr: 60, pmp: 30 },
      criadoEm: now,
      atualizadoEm: now,
    },
    {
      id: newId(),
      nome: 'Clínica Sorriso Pleno',
      cnpj: '34.567.890/0001-12',
      segmento: 'Saúde (odontologia)',
      responsavel: 'Dra. Helena Costa',
      meses: months(labels, [
        { faturamentoBruto: 96000, deducoes: 5760, custosVariaveis: 17280, custosFixos: 19500, folha: 31000, despesasFinanceiras: 2100 },
        { faturamentoBruto: 104500, deducoes: 6270, custosVariaveis: 18810, custosFixos: 19500, folha: 31000, despesasFinanceiras: 1850 },
        { faturamentoBruto: 99800, deducoes: 5988, custosVariaveis: 17964, custosFixos: 19800, folha: 31500, despesasFinanceiras: 1900 },
      ]),
      ciclo: { pme: 0, pmr: 35, pmp: 20 },
      criadoEm: now,
      atualizadoEm: now,
    },
  ];
}
