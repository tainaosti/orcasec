import { Injectable, inject } from '@angular/core';
import { Configuracao, DadosTriagem, Pedido, TipoServico } from '../core/modelos';
import { Catalogo } from '../data/catalogo.repository';
import { PedidosRepository } from '../data/pedidos.repository';
import { Estimativa, criarServico } from '../domain/servico';
import { moeda, numero } from '../shared/formatos';

export const MARGEM_PADRAO = 0.1;

export interface Escolhas {
  tipo: TipoServico;
  porte: Configuracao;
  urgencia: Configuracao;
  margem: number;
}

/**
 * Coordena o fluxo do orçamento: escolhe as regras no catálogo,
 * calcula a estimativa com as classes de domínio e grava o pedido.
 */
@Injectable({ providedIn: 'root' })
export class OrcamentoService {
  private readonly pedidos = inject(PedidosRepository);

  escolhas(catalogo: Catalogo, dados: DadosTriagem): Escolhas | null {
    const tipo = catalogo.tipos.find((t) => t.id === dados.tipo_servico_id);
    const porte = catalogo.portes.find((p) => p.opcao === dados.porte_ambiente);
    const urgencia = catalogo.urgencias.find((u) => u.opcao === dados.urgencia);
    if (!tipo || !porte || !urgencia) return null;
    return { tipo, porte, urgencia, margem: catalogo.margem?.fator ?? MARGEM_PADRAO };
  }

  calcular(escolhas: Escolhas): Estimativa {
    return criarServico(escolhas.tipo).calcularEstimativa({
      fatorPorte: escolhas.porte.fator,
      fatorUrgencia: escolhas.urgencia.fator,
      margem: escolhas.margem,
    });
  }

  async registrar(catalogo: Catalogo, dados: DadosTriagem): Promise<{ pedido: Pedido; memoria: string }> {
    const escolhas = this.escolhas(catalogo, dados);
    if (!escolhas) throw new Error('Opção de cálculo não encontrada.');
    const estimativa = this.calcular(escolhas);
    const pedido = await this.pedidos.registrar(dados, estimativa);
    return { pedido, memoria: this.memoria(escolhas) };
  }

  /** Texto que explica como a estimativa foi calculada. */
  memoria(e: Escolhas): string {
    return (
      `Cálculo: ${numero(e.tipo.horas_base)} h base × ${numero(e.porte.fator)} (porte ${e.porte.rotulo.toLowerCase()}) × ` +
      `${numero(e.urgencia.fator)} (urgência ${e.urgencia.rotulo.toLowerCase()}) × ${moeda(e.tipo.valor_hora)}/h, ` +
      `com margem de ${numero(Math.round(e.margem * 100))}% para mais e para menos.`
    );
  }
}
