import { Injectable, inject } from '@angular/core';
import { DadosTriagem, Pedido, PorteEmpresa } from '../core/modelos';
import { SupabaseService } from '../core/supabase.service';

export const PEDIDOS_POR_PAGINA = 20;

const CAMPOS_PEDIDO = `
  id, nome_cliente, porte_empresa, tipo_servico_id, porte_ambiente, urgencia,
  valor_min, valor_max, horas_estimadas, valor_final, horas_finais, observacoes,
  status, criado_por, revisado_por, criado_em, pdf_gerado_em,
  tipo_servico:tipos_servico(nome),
  criador:usuarios!pedidos_criado_por_fkey(nome),
  revisor:usuarios!pedidos_revisado_por_fkey(nome)
`;

export interface FiltrosPainel {
  porte: PorteEmpresa | 'todos';
  /** "AAAA-MM" ou "todos" */
  mes: string;
  pagina: number;
}

export interface PaginaPedidos {
  pedidos: Pedido[];
  total: number;
}

/** Normaliza os campos numéricos que chegam do PostgreSQL. */
function normalizar(bruto: Record<string, unknown>): Pedido {
  const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...(bruto as unknown as Pedido),
    valor_min: Number(bruto['valor_min']),
    valor_max: Number(bruto['valor_max']),
    horas_estimadas: Number(bruto['horas_estimadas']),
    valor_final: numero(bruto['valor_final']),
    horas_finais: numero(bruto['horas_finais']),
  };
}

/**
 * Acesso à tabela de pedidos. Todas as consultas usam o construtor de
 * consultas do Supabase, que envia parâmetros separados do comando,
 * sem concatenar texto digitado em SQL (proteção contra injeção).
 */
@Injectable({ providedIn: 'root' })
export class PedidosRepository {
  private readonly supabase = inject(SupabaseService);

  async listar(filtros: FiltrosPainel): Promise<PaginaPedidos> {
    const inicio = filtros.pagina * PEDIDOS_POR_PAGINA;
    let consulta = this.supabase.client
      .from('pedidos')
      .select(CAMPOS_PEDIDO, { count: 'exact' })
      .order('criado_em', { ascending: false })
      .range(inicio, inicio + PEDIDOS_POR_PAGINA - 1);

    if (filtros.porte !== 'todos') consulta = consulta.eq('porte_empresa', filtros.porte);

    if (filtros.mes !== 'todos') {
      const [ano, mes] = filtros.mes.split('-').map(Number);
      const de = new Date(ano, mes - 1, 1);
      const ate = new Date(ano, mes, 1);
      consulta = consulta.gte('criado_em', de.toISOString()).lt('criado_em', ate.toISOString());
    }

    const { data, error, count } = await consulta;
    if (error) throw error;
    return { pedidos: (data ?? []).map((p) => normalizar(p)), total: count ?? 0 };
  }

  async buscar(id: string): Promise<Pedido | null> {
    const { data, error } = await this.supabase.client.from('pedidos').select(CAMPOS_PEDIDO).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? normalizar(data) : null;
  }

  /**
   * Registra o pedido (RF02). Os valores calculados no navegador são enviados,
   * mas o banco recalcula tudo pelas regras cadastradas antes de gravar.
   */
  async registrar(
    dados: DadosTriagem,
    estimativa: { valorMin: number; valorMax: number; horas: number },
  ): Promise<Pedido> {
    const { data, error } = await this.supabase.client
      .from('pedidos')
      .insert({
        ...dados,
        valor_min: estimativa.valorMin,
        valor_max: estimativa.valorMax,
        horas_estimadas: estimativa.horas,
      })
      .select(CAMPOS_PEDIDO)
      .single();
    if (error) throw error;
    return normalizar(data);
  }

  /** Salva a revisão do especialista (RF05). */
  async revisar(id: string, valorFinal: number, horasFinais: number, observacoes: string | null): Promise<Pedido> {
    const { data, error } = await this.supabase.client
      .from('pedidos')
      .update({ valor_final: valorFinal, horas_finais: horasFinais, observacoes })
      .eq('id', id)
      .select(CAMPOS_PEDIDO)
      .single();
    if (error) throw error;
    return normalizar(data);
  }

  /** Registra a geração da proposta; o banco muda o status (RF06). */
  async registrarPropostaGerada(id: string): Promise<Pedido> {
    const { data, error } = await this.supabase.client
      .from('pedidos')
      .update({ pdf_gerado_em: new Date().toISOString() })
      .eq('id', id)
      .select(CAMPOS_PEDIDO)
      .single();
    if (error) throw error;
    return normalizar(data);
  }
}
