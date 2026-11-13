import { Injectable, computed, inject, signal } from '@angular/core';
import { Perfil, Usuario } from './modelos';
import { SupabaseService } from './supabase.service';

export type ResultadoLogin = 'ok' | 'credenciais' | 'muitas_tentativas' | 'indisponivel';

/** Autenticação pelo Supabase Auth (RF01 e RNF01). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly usuario = signal<Usuario | null>(null);
  readonly perfil = computed<Perfil | null>(() => this.usuario()?.perfil ?? null);

  /** Resolve quando a sessão salva no navegador já foi verificada. */
  readonly pronto: Promise<void>;

  constructor() {
    this.pronto = this.restaurarSessao();
    this.supabase.client.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') this.usuario.set(null);
    });
  }

  temPerfil(...perfis: Perfil[]): boolean {
    const atual = this.perfil();
    return atual !== null && perfis.includes(atual);
  }

  async entrar(email: string, senha: string): Promise<ResultadoLogin> {
    if (!this.supabase.configurado) return 'indisponivel';

    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      if (error.status === 429) return 'muitas_tentativas';
      return error.status && error.status >= 500 ? 'indisponivel' : 'credenciais';
    }

    const perfilCarregado = data.user ? await this.carregarPerfil(data.user.id) : false;
    if (!perfilCarregado) {
      // Usuário sem perfil ou inativo: encerra a sessão e mostra a mesma
      // mensagem genérica, sem revelar o motivo.
      await this.supabase.client.auth.signOut();
      return 'credenciais';
    }
    return 'ok';
  }

  async sair(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.usuario.set(null);
  }

  private async restaurarSessao(): Promise<void> {
    if (!this.supabase.configurado) return;
    const { data } = await this.supabase.client.auth.getSession();
    if (data.session) {
      const ok = await this.carregarPerfil(data.session.user.id);
      if (!ok) await this.supabase.client.auth.signOut();
    }
  }

  private async carregarPerfil(id: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('id, nome, perfil, ativo')
      .eq('id', id)
      .maybeSingle();

    if (error || !data || !data.ativo) {
      this.usuario.set(null);
      return false;
    }
    this.usuario.set(data as Usuario);
    return true;
  }
}
