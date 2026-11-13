import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Pedido, PorteEmpresa, ROTULO_PORTE_EMPRESA } from '../../core/modelos';
import { PEDIDOS_POR_PAGINA, PedidosRepository } from '../../data/pedidos.repository';
import { Cabecalho } from '../../shared/cabecalho';
import { dataCurta, faixa } from '../../shared/formatos';
import { Icone } from '../../shared/icone';
import { StatusPedidoComponent } from '../../shared/status-pedido';

interface OpcaoMes { valor: string; rotulo: string; }

function mesesRecentes(quantidade: number): OpcaoMes[] {
  const hoje = new Date();
  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const rotulo = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const valor = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    return { valor, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) };
  });
}

/** Tela 1 – Painel de pedidos (RF04, RF08). */
@Component({
  selector: 'app-painel',
  imports: [RouterLink, Cabecalho, Icone, StatusPedidoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .topo { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; }
    .filtros { flex-direction: row; flex-wrap: wrap; align-items: flex-end; gap: 16px 20px; padding: 16px 20px; }
    .filtros .campo__controle { min-width: 200px; }
    .lista { padding: 0; gap: 0; overflow: hidden; }
    .lista__titulo { padding: 16px 20px; font-size: 17px; border-bottom: 1px solid var(--borda); }
    .rolagem { overflow-x: auto; }
    .tabela { min-width: 900px; font-size: 14px; }
    .linha { display: grid; grid-template-columns: 1.7fr .8fr 1.1fr 1.5fr 1.3fr .9fr .8fr; gap: 12px; align-items: center; padding: 10px 20px; border-top: 1px solid var(--borda); }
    .linha--cabecalho { background: #f9fafb; color: #374151; font-weight: 600; padding: 12px 20px; border-top: 0; }
    .cliente { font-weight: 600; }
    .vazio { padding: 32px 20px; text-align: center; color: var(--texto-suave); border-top: 1px solid var(--borda); }
    .rodape { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; border-top: 1px solid var(--borda); }
  `,
  template: `
    <app-cabecalho secao="painel" />
    <main class="pagina" style="padding-top: 32px; gap: 24px;">
      <div class="topo">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h1 class="titulo">Pedidos de orçamento</h1>
          <p class="texto-suave">Acompanhe os pedidos registrados e o status de cada proposta.</p>
        </div>
        @if (podeRegistrar()) {
          <a routerLink="/pedidos/novo" class="botao botao--primario"><app-icone nome="mais" /> Novo pedido</a>
        }
      </div>

      <section aria-label="Filtros" class="card filtros">
        <div class="campo">
          <label for="filtro-porte" class="campo__rotulo">Porte da empresa</label>
          <select id="filtro-porte" class="campo__controle" [value]="porte()" (change)="mudarPorte($event)">
            <option value="todos">Todos</option>
            @for (opcao of portes; track opcao.valor) {
              <option [value]="opcao.valor">{{ opcao.rotulo }}</option>
            }
          </select>
        </div>
        <div class="campo">
          <label for="filtro-mes" class="campo__rotulo">Mês de criação</label>
          <select id="filtro-mes" class="campo__controle" [value]="mes()" (change)="mudarMes($event)">
            @for (opcao of meses; track opcao.valor) {
              <option [value]="opcao.valor">{{ opcao.rotulo }}</option>
            }
            <option value="todos">Todos os meses</option>
          </select>
        </div>
        <p class="texto-suave texto-pequeno" aria-live="polite" style="margin-bottom: 10px;">{{ textoTotal() }}</p>
      </section>

      @if (erroCarga()) {
        <div class="alerta alerta--erro" role="alert">
          <app-icone nome="alerta" [tamanho]="20" />
          <span>Não foi possível carregar os pedidos. Atualize a página para tentar de novo.</span>
        </div>
      }

      <section aria-labelledby="titulo-lista" class="card lista">
        <h2 id="titulo-lista" class="titulo-secao lista__titulo">Lista de pedidos</h2>
        <div class="rolagem">
          <div role="table" aria-label="Pedidos de orçamento" class="tabela" [attr.aria-busy]="carregando()">
            <div role="row" class="linha linha--cabecalho">
              <div role="columnheader">Cliente</div>
              <div role="columnheader">Porte</div>
              <div role="columnheader">Serviço</div>
              <div role="columnheader">Faixa estimada</div>
              <div role="columnheader">Status</div>
              <div role="columnheader">Data</div>
              <div role="columnheader">Ações</div>
            </div>
            @for (pedido of pedidos(); track pedido.id) {
              <div role="row" class="linha">
                <div role="cell" class="cliente">{{ pedido.nome_cliente }}</div>
                <div role="cell">{{ rotuloPorte(pedido) }}</div>
                <div role="cell">{{ pedido.tipo_servico?.nome }}</div>
                <div role="cell">{{ faixaDe(pedido) }}</div>
                <div role="cell"><app-status-pedido [status]="pedido.status" /></div>
                <div role="cell">{{ data(pedido.criado_em) }}</div>
                <div role="cell">
                  <a [routerLink]="['/pedidos', pedido.id]" class="botao botao--contorno botao--pequeno"
                     [attr.aria-label]="'Abrir pedido de ' + pedido.nome_cliente">Abrir</a>
                </div>
              </div>
            } @empty {
              @if (!carregando() && !erroCarga()) {
                <div role="row"><p role="cell" class="vazio">Nenhum pedido encontrado para os filtros escolhidos. Altere os filtros ou registre um novo pedido.</p></div>
              }
            }
            @if (carregando()) {
              <div role="row"><p role="cell" class="vazio">Carregando pedidos…</p></div>
            }
          </div>
        </div>
        <div class="rodape">
          <p class="texto-suave texto-pequeno">Mostrando {{ pedidos().length }} de {{ total() }} pedidos · {{ porPagina }} por página</p>
          <div class="acoes" style="gap: 8px;">
            <button type="button" class="botao botao--neutro botao--pequeno" [disabled]="pagina() === 0 || carregando()" (click)="irPara(pagina() - 1)">Anterior</button>
            <button type="button" class="botao botao--neutro botao--pequeno" [disabled]="!temProxima() || carregando()" (click)="irPara(pagina() + 1)">Próxima</button>
          </div>
        </div>
      </section>
    </main>
  `,
})
export class PainelPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly repositorio = inject(PedidosRepository);

  protected readonly porPagina = PEDIDOS_POR_PAGINA;
  protected readonly meses = mesesRecentes(12);
  protected readonly portes = (Object.keys(ROTULO_PORTE_EMPRESA) as PorteEmpresa[]).map((valor) => ({
    valor,
    rotulo: ROTULO_PORTE_EMPRESA[valor],
  }));

  protected readonly porte = signal<PorteEmpresa | 'todos'>('todos');
  protected readonly mes = signal(this.meses[0].valor);
  protected readonly pagina = signal(0);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly total = signal(0);
  protected readonly carregando = signal(true);
  protected readonly erroCarga = signal(false);

  protected readonly podeRegistrar = computed(() => this.auth.temPerfil('comercial', 'gestor'));
  protected readonly temProxima = computed(() => (this.pagina() + 1) * PEDIDOS_POR_PAGINA < this.total());
  protected readonly textoTotal = computed(() => {
    const n = this.total();
    return n === 1 ? '1 pedido encontrado' : `${n} pedidos encontrados`;
  });

  ngOnInit(): void {
    void this.carregar();
  }

  protected mudarPorte(evento: Event): void {
    this.porte.set((evento.target as HTMLSelectElement).value as PorteEmpresa | 'todos');
    this.irPara(0);
  }

  protected mudarMes(evento: Event): void {
    this.mes.set((evento.target as HTMLSelectElement).value);
    this.irPara(0);
  }

  protected irPara(pagina: number): void {
    this.pagina.set(pagina);
    void this.carregar();
  }

  protected rotuloPorte(pedido: Pedido): string {
    return ROTULO_PORTE_EMPRESA[pedido.porte_empresa];
  }

  protected faixaDe(pedido: Pedido): string {
    return faixa(pedido.valor_min, pedido.valor_max);
  }

  protected data(iso: string): string {
    return dataCurta(iso);
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarga.set(false);
    try {
      const resultado = await this.repositorio.listar({ porte: this.porte(), mes: this.mes(), pagina: this.pagina() });
      this.pedidos.set(resultado.pedidos);
      this.total.set(resultado.total);
    } catch {
      this.pedidos.set([]);
      this.total.set(0);
      this.erroCarga.set(true);
    } finally {
      this.carregando.set(false);
    }
  }
}
