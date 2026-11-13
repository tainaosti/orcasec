import { TipoServico } from '../core/modelos';

/** Fatores aplicados sobre um serviço no cálculo da estimativa. */
export interface FatoresCalculo {
  fatorPorte: number;
  fatorUrgencia: number;
  /** Percentual da faixa, de 0 a 1 (0,10 = 10% para mais e para menos). */
  margem: number;
}

export interface Estimativa {
  horas: number;
  valorCentral: number;
  valorMin: number;
  valorMax: number;
}

export class RegraDeCalculoInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'RegraDeCalculoInvalida';
  }
}

/**
 * Classe base dos serviços oferecidos pela Katrinasec.
 *
 * Encapsulamento: valor por hora e horas base só são definidos no construtor,
 * que valida os dados. Ninguém de fora consegue deixar um serviço com valor
 * negativo ou zerado.
 *
 * Polimorfismo: cada tipo de serviço é uma subclasse. Quando um serviço passar
 * a ter regra própria, basta sobrescrever `horasAjustadas()` na subclasse,
 * sem mexer nas telas nem no restante do sistema.
 */
export abstract class Servico {
  private readonly _valorHora: number;
  private readonly _horasBase: number;

  protected constructor(
    readonly codigo: string,
    readonly nome: string,
    valorHora: number,
    horasBase: number,
  ) {
    Servico.exigirPositivo(valorHora, 'O valor por hora');
    Servico.exigirPositivo(horasBase, 'As horas base');
    this._valorHora = valorHora;
    this._horasBase = horasBase;
  }

  get valorHora(): number {
    return this._valorHora;
  }

  get horasBase(): number {
    return this._horasBase;
  }

  /** Ponto de extensão para regras específicas de cada serviço. */
  protected horasAjustadas(fatores: FatoresCalculo): number {
    return this.horasBase * fatores.fatorPorte * fatores.fatorUrgencia;
  }

  /** Calcula horas e faixa de preço (RF03). */
  calcularEstimativa(fatores: FatoresCalculo): Estimativa {
    Servico.exigirPositivo(fatores.fatorPorte, 'O fator de porte');
    Servico.exigirPositivo(fatores.fatorUrgencia, 'O fator de urgência');
    if (!(fatores.margem >= 0 && fatores.margem < 1)) {
      throw new RegraDeCalculoInvalida('A margem deve ficar entre 0% e 99%.');
    }

    const horas = Math.round(this.horasAjustadas(fatores) * 10) / 10;
    const valorCentral = horas * this.valorHora;
    return {
      horas,
      valorCentral: Math.round(valorCentral),
      valorMin: Math.round(valorCentral * (1 - fatores.margem)),
      valorMax: Math.round(valorCentral * (1 + fatores.margem)),
    };
  }

  private static exigirPositivo(valor: number, descricao: string): void {
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new RegraDeCalculoInvalida(`${descricao} deve ser maior que zero.`);
    }
  }
}

export class ServicoAplicacaoWeb extends Servico {
  constructor(nome: string, valorHora: number, horasBase: number) {
    super('web', nome, valorHora, horasBase);
  }
}

export class ServicoRedeInterna extends Servico {
  constructor(nome: string, valorHora: number, horasBase: number) {
    super('rede', nome, valorHora, horasBase);
  }
}

export class ServicoAplicativoMovel extends Servico {
  constructor(nome: string, valorHora: number, horasBase: number) {
    super('mobile', nome, valorHora, horasBase);
  }
}

/** Usado para serviços cadastrados pelo gestor que ainda não têm classe própria. */
export class ServicoGenerico extends Servico {
  constructor(codigo: string, nome: string, valorHora: number, horasBase: number) {
    super(codigo, nome, valorHora, horasBase);
  }
}

type ConstrutorServico = new (nome: string, valorHora: number, horasBase: number) => Servico;

const SERVICOS_CONHECIDOS: Record<string, ConstrutorServico> = {
  web: ServicoAplicacaoWeb,
  rede: ServicoRedeInterna,
  mobile: ServicoAplicativoMovel,
};

/** Cria o objeto de serviço adequado a partir do cadastro do banco. */
export function criarServico(
  tipo: Pick<TipoServico, 'codigo' | 'nome' | 'valor_hora' | 'horas_base'>,
): Servico {
  const valorHora = Number(tipo.valor_hora);
  const horasBase = Number(tipo.horas_base);
  const Construtor = SERVICOS_CONHECIDOS[tipo.codigo];
  return Construtor
    ? new Construtor(tipo.nome, valorHora, horasBase)
    : new ServicoGenerico(tipo.codigo, tipo.nome, valorHora, horasBase);
}
