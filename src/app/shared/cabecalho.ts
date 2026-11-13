import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ROTULO_PERFIL } from '../core/modelos';
import { Icone } from './icone';

export type SecaoAtual = 'painel' | 'novo' | 'configuracoes';

@Component({
  selector: 'app-cabecalho',
  imports: [RouterLink, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecalho">
      <div class="cabecalho__grupo">
        <a routerLink="/painel" class="marca" aria-label="OrçaSec, ir para o painel">
          <app-icone nome="escudo" [tamanho]="24" />
          <span>OrçaSec</span>
        </a>
        <nav aria-label="Navegação principal" class="nav">
          <a routerLink="/painel" class="nav__link" [class.nav__link--ativo]="secao() === 'painel'"
             [attr.aria-current]="secao() === 'painel' ? 'page' : null">Painel</a>
          @if (podeRegistrar()) {
            <a routerLink="/pedidos/novo" class="nav__link" [class.nav__link--ativo]="secao() === 'novo'"
               [attr.aria-current]="secao() === 'novo' ? 'page' : null">Novo pedido</a>
          }
          @if (ehGestor()) {
            <a routerLink="/configuracoes" class="nav__link" [class.nav__link--ativo]="secao() === 'configuracoes'"
               [attr.aria-current]="secao() === 'configuracoes' ? 'page' : null">Configurações</a>
          }
        </nav>
      </div>
      <div class="cabecalho__usuario">
        <span>{{ identificacao() }}</span>
        <button type="button" class="botao botao--escuro" (click)="sair()">Sair</button>
      </div>
    </header>
  `,
})
export class Cabecalho {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly secao = input<SecaoAtual | null>(null);

  protected readonly podeRegistrar = computed(() => this.auth.temPerfil('comercial', 'gestor'));
  protected readonly ehGestor = computed(() => this.auth.perfil() === 'gestor');
  protected readonly identificacao = computed(() => {
    const usuario = this.auth.usuario();
    return usuario ? `${usuario.nome} · ${ROTULO_PERFIL[usuario.perfil]}` : '';
  });

  protected async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl('/login');
  }
}
