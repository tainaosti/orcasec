import { describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';
import { lerNumeroBR, numeroPositivo, semMarcacao } from './validacao';

describe('Leitura de números no formato brasileiro', () => {
  it('entende milhar com ponto e decimal com vírgula', () => {
    expect(lerNumeroBR('14.000')).toBe(14000);
    expect(lerNumeroBR('14000')).toBe(14000);
    expect(lerNumeroBR('R$ 14.000,50')).toBe(14000.5);
    expect(lerNumeroBR('1,5')).toBe(1.5);
    expect(lerNumeroBR('1.5')).toBe(1.5);
  });

  it('rejeita textos que não são números', () => {
    expect(lerNumeroBR('abc')).toBeNull();
    expect(lerNumeroBR('')).toBeNull();
    expect(lerNumeroBR('12a')).toBeNull();
  });
});

describe('Validações de entrada (RNF02)', () => {
  it('rejeita caracteres de marcação', () => {
    expect(new FormControl('<script>alert(1)</script>', semMarcacao()).hasError('marcacao')).toBe(true);
    expect(new FormControl('Padaria Pão Dourado Ltda', semMarcacao()).valid).toBe(true);
  });

  it('salva texto com comandos SQL apenas como texto (sem < ou >, é aceito)', () => {
    expect(new FormControl("' OR 1=1; DROP TABLE pedidos; --", semMarcacao()).valid).toBe(true);
  });

  it('exige números maiores que zero', () => {
    expect(new FormControl('0', numeroPositivo()).hasError('positivo')).toBe(true);
    expect(new FormControl('-5', numeroPositivo()).hasError('positivo')).toBe(true);
    expect(new FormControl('14.000', numeroPositivo()).valid).toBe(true);
  });
});
