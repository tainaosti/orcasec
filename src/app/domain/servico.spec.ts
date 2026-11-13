import { describe, expect, it } from 'vitest';
import {
  RegraDeCalculoInvalida,
  ServicoAplicacaoWeb,
  ServicoGenerico,
  ServicoRedeInterna,
  criarServico,
} from './servico';

describe('Cálculo da estimativa (RF03)', () => {
  it('calcula o caso de teste documentado: 72 horas e faixa de R$ 12.960 a R$ 15.840', () => {
    const servico = new ServicoAplicacaoWeb('Aplicação web', 200, 40);
    const estimativa = servico.calcularEstimativa({ fatorPorte: 1.5, fatorUrgencia: 1.2, margem: 0.1 });

    expect(estimativa.horas).toBe(72);
    expect(estimativa.valorCentral).toBe(14400);
    expect(estimativa.valorMin).toBe(12960);
    expect(estimativa.valorMax).toBe(15840);
  });

  it('nunca gera valor mínimo maior que o máximo', () => {
    const servico = new ServicoRedeInterna('Rede interna', 180, 32);
    const estimativa = servico.calcularEstimativa({ fatorPorte: 2, fatorUrgencia: 1, margem: 0.25 });
    expect(estimativa.valorMax).toBeGreaterThanOrEqual(estimativa.valorMin);
  });

  it('impede criar serviço com valor por hora zerado ou negativo', () => {
    expect(() => new ServicoAplicacaoWeb('Aplicação web', 0, 40)).toThrow(RegraDeCalculoInvalida);
    expect(() => new ServicoAplicacaoWeb('Aplicação web', -10, 40)).toThrow(RegraDeCalculoInvalida);
  });

  it('impede fatores inválidos e margem fora do intervalo', () => {
    const servico = new ServicoAplicacaoWeb('Aplicação web', 200, 40);
    expect(() => servico.calcularEstimativa({ fatorPorte: -1, fatorUrgencia: 1, margem: 0.1 })).toThrow();
    expect(() => servico.calcularEstimativa({ fatorPorte: 1, fatorUrgencia: 1, margem: 1 })).toThrow();
  });
});

describe('Criação de serviços a partir do cadastro', () => {
  it('usa a subclasse correspondente ao código', () => {
    const servico = criarServico({ codigo: 'web', nome: 'Aplicação web', valor_hora: 200, horas_base: 40 });
    expect(servico).toBeInstanceOf(ServicoAplicacaoWeb);
  });

  it('usa o serviço genérico para códigos novos cadastrados pelo gestor', () => {
    const servico = criarServico({ codigo: 'nuvem', nome: 'Nuvem', valor_hora: 250, horas_base: 20 });
    expect(servico).toBeInstanceOf(ServicoGenerico);
    expect(servico.calcularEstimativa({ fatorPorte: 1, fatorUrgencia: 1, margem: 0 }).valorCentral).toBe(5000);
  });
});
