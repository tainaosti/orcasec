import { Injectable, inject } from '@angular/core';
import { Configuracao, TipoServico } from '../core/modelos';
import { SupabaseService } from '../core/supabase.service';

export interface Catalogo {
  tipos: TipoServico[];
  portes: Configuracao[];
  urgencias: Configuracao[];
  margem: Configuracao | null;
}

/** Acesso às tabelas tipos_servico e configuracoes. */
@Injectable({ providedIn: 'root' })
export class CatalogoRepository {
  private readonly supabase = inject(SupabaseService);

  async carregar(incluirInativos = false): Promise<Catalogo> {
    let consultaTipos = this.supabase.client
      .from('tipos_servico')
      .select('id, codigo, nome, descricao, valor_hora, horas_base, ativo')
      .order('nome');
    if (!incluirInativos) consultaTipos = consultaTipos.eq('ativo', true);

    const [tipos, configuracoes] = await Promise.all([
      consultaTipos,
      this.supabase.client
        .from('configuracoes')
        .select('id, categoria, opcao, rotulo, fator, ordem')
        .order('ordem'),
    ]);

    if (tipos.error) throw tipos.error;
    if (configuracoes.error) throw configuracoes.error;

    const lista = (configuracoes.data ?? []).map((c) => ({ ...c, fator: Number(c.fator) })) as Configuracao[];
    return {
      tipos: (tipos.data ?? []).map((t) => ({
        ...t,
        valor_hora: Number(t.valor_hora),
        horas_base: Number(t.horas_base),
      })) as TipoServico[],
      portes: lista.filter((c) => c.categoria === 'porte'),
      urgencias: lista.filter((c) => c.categoria === 'urgencia'),
      margem: lista.find((c) => c.categoria === 'margem') ?? null,
    };
  }

  async salvarTipos(tipos: Pick<TipoServico, 'id' | 'valor_hora' | 'horas_base' | 'ativo'>[]): Promise<void> {
    const resultados = await Promise.all(
      tipos.map((t) =>
        this.supabase.client
          .from('tipos_servico')
          .update({ valor_hora: t.valor_hora, horas_base: t.horas_base, ativo: t.ativo })
          .eq('id', t.id),
      ),
    );
    const falha = resultados.find((r) => r.error);
    if (falha?.error) throw falha.error;
  }

  async salvarFatores(itens: Pick<Configuracao, 'id' | 'fator'>[]): Promise<void> {
    const resultados = await Promise.all(
      itens.map((c) => this.supabase.client.from('configuracoes').update({ fator: c.fator }).eq('id', c.id)),
    );
    const falha = resultados.find((r) => r.error);
    if (falha?.error) throw falha.error;
  }
}
