import { describe, expect, it } from 'vitest';
import { faixa, horas, moeda, numero } from './formatos';

describe('Formatação de valores', () => {
  it('formata moeda no padrão brasileiro', () => {
    expect(moeda(12960)).toBe('R$ 12.960');
  });

  it('formata a faixa de preço como no painel', () => {
    expect(faixa(12960, 15840)).toBe('R$ 12.960 a R$ 15.840');
  });

  it('usa singular e plural nas horas', () => {
    expect(horas(1)).toBe('1 hora');
    expect(horas(72)).toBe('72 horas');
  });

  it('usa vírgula nos fatores decimais', () => {
    expect(numero(1.5)).toBe('1,5');
  });
});
