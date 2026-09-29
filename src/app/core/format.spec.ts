import { brl, brlCompact, nextMonthLabel, numForEdit, numForInput, parseNumberBR, pct } from './format';

describe('format', () => {
  describe('parseNumberBR', () => {
    const cases: [unknown, number | null][] = [
      ['1.234,56', 1234.56],
      ['R$ 12.000', 12000],
      ['R$ 262.400,00', 262400],
      ['1.234.567', 1234567],
      ['250000', 250000],
      ['1234,5', 1234.5],
      ['1.5', 1.5],
      ['1,234.56', 1234.56],
      ['(1.500)', -1500],
      ['-300', -300],
      ['\u2212300', -300],
      [42, 42],
      ['', null],
      ['R$', null],
      ['abc', null],
      [null, null],
      [NaN, null],
    ];
    for (const [input, expected] of cases) {
      it(`lê ${JSON.stringify(input)} como ${expected}`, () => {
        expect(parseNumberBR(input)).toBe(expected);
      });
    }
  });

  it('formata texto de edição sem separador de milhar, para acrescentar dígitos com segurança', () => {
    expect(numForEdit(250000)).toBe('250000');
    expect(numForEdit(1234.5)).toBe('1234,5');
    expect(parseNumberBR(numForEdit(3000) + '0')).toBe(30000);
    expect(numForInput(250000)).toBe('250.000');
    expect(numForEdit(null)).toBe('');
  });

  it('formata reais e porcentagens no padrão brasileiro', () => {
    expect(brl(138450)).toBe('R$\u00a0138.450');
    expect(brl(-6.4, true)).toBe('\u2212R$\u00a06,40');
    expect(brlCompact(412000)).toBe('R$\u00a0412\u00a0mil');
    expect(pct(0.342)).toBe('34,2%');
  });

  it('sugere o próximo mês', () => {
    expect(nextMonthLabel('mar', 2)).toBe('abr');
    expect(nextMonthLabel('dez/25', 11)).toBe('jan/26');
    expect(nextMonthLabel('Mês 2', 1)).toBe('Mês 3');
    expect(nextMonthLabel('qualquer', 4)).toBe('Mês 5');
  });
});
