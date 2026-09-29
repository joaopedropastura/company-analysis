# A SOARES ADMIN (UI)

Painel do CFO Fracionado com o raio-X financeiro das empresas clientes, a
partir da planilha de diagnóstico: fluxo de caixa mensal (DRE em regime de
caixa) e ciclo financeiro (PME, PMR, PMP).

## Rodando

```bash
npm install
npm start          # http://localhost:4200
npm test           # testes unitários (Karma + Chrome)
npm run build      # build de produção em dist/
```

Sem empresas cadastradas, o painel oferece "Explorar com empresas de exemplo"
para ver tudo funcionando.

## Telas

- **Painel** (`/dashboard?empresa=<id>`): carteira de clientes; rentabilidade
  (margem bruta, EBITDA e líquida sobre a receita líquida, como no artigo do
  Insper sobre os 10 principais indicadores financeiros); cascata "para onde
  vai o faturamento"; custos fixos e variáveis, ponto de equilíbrio e juros;
  fluxo de caixa mês a mês (entradas x saídas por tipo, com o saldo); ciclo
  financeiro com o capital de giro preso nos prazos; faturamento x ponto de
  equilíbrio; margens mês a mês; lucro x faturamento e DRE detalhado.
  "Apresentar ao cliente" esconde a carteira (nomes dos outros clientes) e os
  botões de edição.
- **Exportar PDF** (botão no painel): abre a impressão do navegador com um
  layout de relatório em A4 retrato, tema claro e sem controles. Escolha
  "Salvar como PDF" como destino; o nome sugerido é "A SOARES ADMIN -
  empresa - período". Ctrl+P/Cmd+P usa o mesmo layout. Com mais de 6 meses, o
  DRE sai com os meses nas linhas para caber na página. As regras ficam no
  final de `dashboard.scss` (classe `is-printing`) e em `styles/_print.scss`.
- **Cadastro** (`/registrations`, `/registrations/<id>`): importação de Excel
  ou digitação manual. A grade do DRE funciona como planilha: Enter desce uma
  linha e dá para colar um bloco copiado do Excel.

## Importação do Excel

O modelo fica em `public/template-dashboard-empresas.xlsx` (botão "Baixar
modelo"). O leitor (`src/app/core/services/excel-import.ts`) procura as linhas
pelo nome, então tolera acentos, maiúsculas, "(+)/(-)" no rótulo, saídas com
sinal negativo, valores em texto ("R$ 1.234,56") e qualquer número de meses.
Também lê, em qualquer aba, linhas no formato rótulo + valor:

- ciclo financeiro: `Prazo Médio de Estocagem (PME)`, `... de Recebimento
  (PMR)` e `... de Pagamento (PMP)`, como na aba "Ciclo Financeiro". Se a aba
  trouxer o ciclo operacional ou o financeiro, a importação confere com o
  cálculo e avisa se divergir;
- dados da empresa: `Empresa`, `CNPJ`, `Segmento` e `Responsável`.

Receita líquida, margem, resultado e lucro são sempre recalculados; se a
planilha trouxer um total diferente do cálculo, a importação avisa.

## Onde mexer

- Cálculos (DRE, margens, ponto de equilíbrio, ciclo e capital de giro):
  `src/app/core/finance/finance.ts`.
- Dados: por enquanto ficam no `localStorage` do navegador
  (`src/app/core/services/company-store.ts`). Para usar a API .NET, troque os
  métodos `read`/`write` dessa classe por chamadas HTTP; as telas só conversam
  com ela.
- Cores e tipografia: tokens em `src/styles/_tokens.scss` (tema claro e
  escuro). As cores dos gráficos foram validadas para daltonismo; se trocar,
  valide de novo.
