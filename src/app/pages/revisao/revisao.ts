import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Pedido, ROTULO_PORTE_EMPRESA } from '../../core/modelos';
import { Catalogo, CatalogoRepository } from '../../data/catalogo.repository';
import { PedidosRepository } from '../../data/pedidos.repository';
import { lerNumeroBR, numeroPositivo, semMarcacao } from '../../domain/validacao';
import { PropostaPdfService } from '../../services/proposta-pdf.service';
import { Cabecalho } from '../../shared/cabecalho';
import { dataHora, faixa, horas } from '../../shared/formatos';
import { Icone } from '../../shared/icone';
import { StatusPedidoComponent } from '../../shared/status-pedido';

type Aviso = 'salvo' | 'gerado' | null;

/** Tela 3 – Revisão do especialista e geração da proposta (RF05, RF06). */
@Component({
  selector: 'app-revisao',
  imports: [ReactiveFormsModule, RouterLink, Cabecalho, Icone, StatusPedidoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-cabecalho secao="painel" />
    <main class="pagina">
      <a routerLink="/painel" class="link-voltar"><app-icone nome="voltar" /> Voltar ao painel</a>

      @if (carregando()) {
        <p class="texto-suave" role="status">Carregando pedido…</p>
      } @else if (!pedido()) {
        <div class="alerta alerta--erro" role="alert">
          <app-icone nome="alerta" [tamanho]="20" />
          <span>{{ erroCarga() ? 'Não foi possível carregar o pedido. Atualize a página para tentar de novo.' : 'Pedido não encontrado. Confira o link ou volte ao painel.' }}</span>
        </div>
      } @else {
        @let p = pedido()!;
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px;">
          <h1 class="titulo">Revisão do pedido</h1>
          <app-status-pedido [status]="p.status" />
        </div>

        <div class="colunas">
          <section class="card colunas__lateral" aria-labelledby="titulo-resumo" style="flex-basis: 360px;">
            <h2 id="titulo-resumo" class="titulo-secao">Resumo da triagem</h2>
            <dl class="dados">
              <div class="dados__item--inteiro"><dt>Cliente</dt><dd style="font-weight: 600;">{{ p.nome_cliente }}</dd></div>
              <div><dt>Porte da empresa</dt><dd>{{ rotuloPorteEmpresa(p) }}</dd></div>
              <div><dt>Tipo de serviço</dt><dd>{{ p.tipo_servico?.nome }}</dd></div>
              <div><dt>Porte do ambiente</dt><dd>{{ rotuloAmbiente() }}</dd></div>
              <div><dt>Urgência</dt><dd>{{ rotuloUrgencia() }}</dd></div>
              <div><dt>Faixa estimada</dt><dd class="dados__destaque">{{ faixaDe(p) }}</dd></div>
              <div><dt>Horas estimadas</dt><dd class="dados__destaque">{{ horasDe(p.horas_estimadas) }}</dd></div>
              <div class="dados__item--inteiro"><dt>Registrado por</dt><dd>{{ p.criador?.nome }} (comercial), em {{ quando(p.criado_em) }}</dd></div>
            </dl>
          </section>

          <form class="card colunas__principal" [formGroup]="form" (ngSubmit)="salvar()" novalidate aria-labelledby="titulo-revisao">
            <h2 id="titulo-revisao" class="titulo-secao">Revisão técnica</h2>

            @if (!podeRevisar()) {
              <div role="alert" class="alerta alerta--aviso">
                <app-icone nome="cadeado" [tamanho]="20" />
                <span>Você não tem permissão para alterar este valor. Apenas especialistas e gestores podem revisar pedidos e gerar propostas.</span>
              </div>
            }
            @if (aviso() === 'salvo') {
              <div role="status" class="alerta alerta--info">
                <app-icone nome="info" [tamanho]="20" />
                <span>Revisão salva por {{ nomeUsuario() }}. A proposta já pode ser gerada em PDF.</span>
              </div>
            }
            @if (aviso() === 'gerado') {
              <div role="status" class="alerta alerta--sucesso">
                <app-icone nome="confirmar" [tamanho]="20" />
                <span>Proposta gerada com sucesso. O PDF foi baixado e o status do pedido mudou para “Proposta enviada”.</span>
              </div>
            }
            @if (erroAcao(); as msg) {
              <div role="alert" class="alerta alerta--erro">
                <app-icone nome="alerta" [tamanho]="20" />
                <span>{{ msg }}</span>
              </div>
            }

            <div class="grade-2">
              <div class="campo">
                <label for="valorFinal" class="campo__rotulo">Valor final (R$)</label>
                <input id="valorFinal" type="text" inputmode="decimal" class="campo__controle" formControlName="valorFinal" placeholder="Ex.: 14.000"
                       [attr.aria-invalid]="erro('valorFinal') ? 'true' : null"
                       [attr.aria-describedby]="erro('valorFinal') ? 'erro-valorFinal' : null">
                @if (erro('valorFinal'); as msg) {
                  <p id="erro-valorFinal" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
                }
              </div>
              <div class="campo">
                <label for="horasFinais" class="campo__rotulo">Horas finais</label>
                <input id="horasFinais" type="text" inputmode="decimal" class="campo__controle" formControlName="horasFinais" placeholder="Ex.: 70"
                       [attr.aria-invalid]="erro('horasFinais') ? 'true' : null"
                       [attr.aria-describedby]="erro('horasFinais') ? 'erro-horasFinais' : null">
                @if (erro('horasFinais'); as msg) {
                  <p id="erro-horasFinais" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
                }
              </div>
            </div>

            <div class="campo">
              <label for="observacoes" class="campo__rotulo">Observações técnicas (opcional)</label>
              <textarea id="observacoes" rows="3" class="campo__controle" formControlName="observacoes" maxlength="1000"
                        [attr.aria-invalid]="erro('observacoes') ? 'true' : null"
                        [attr.aria-describedby]="erro('observacoes') ? 'erro-observacoes' : null"></textarea>
              @if (erro('observacoes'); as msg) {
                <p id="erro-observacoes" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
              }
            </div>

            <div class="acoes" style="padding-top: 4px;">
              <button type="submit" class="botao botao--contorno" [disabled]="!podeRevisar() || salvando()">
                {{ salvando() ? 'Salvando…' : 'Salvar revisão' }}
              </button>
              <button type="button" class="botao botao--primario" [disabled]="!podeGerar()" (click)="gerar()"
                      [attr.aria-describedby]="mostrarDica() ? 'dica-pdf' : null">
                <app-icone nome="pdf" /> {{ gerando() ? 'Gerando…' : 'Gerar proposta em PDF' }}
              </button>
            </div>
            @if (mostrarDica()) {
              <p id="dica-pdf" class="dica"><app-icone nome="info" [tamanho]="16" />Preencha o valor final e as horas e clique em “Salvar revisão” para liberar a geração da proposta.</p>
            }
            @if (aviso() === 'gerado') {
              <a routerLink="/painel" class="botao botao--primario" style="align-self: flex-start;">Voltar ao painel</a>
            }
          </form>
        </div>
      }
    </main>
  `,
})
export class RevisaoPage implements OnInit {
  /** Recebido da rota /pedidos/:id */
  readonly id = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly pedidos = inject(PedidosRepository);
  private readonly catalogoRepo = inject(CatalogoRepository);
  private readonly pdf = inject(PropostaPdfService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    valorFinal: ['', [Validators.required, numeroPositivo()]],
    horasFinais: ['', [Validators.required, numeroPositivo()]],
    observacoes: ['', [Validators.maxLength(1000), semMarcacao()]],
  });

  protected readonly pedido = signal<Pedido | null>(null);
  private readonly catalogo = signal<Catalogo | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erroCarga = signal(false);
  protected readonly salvando = signal(false);
  protected readonly gerando = signal(false);
  protected readonly aviso = signal<Aviso>(null);
  protected readonly erroAcao = signal<string | null>(null);
  private readonly tentou = signal(false);
  /** Verdadeiro quando o formulário tem alterações ainda não salvas. */
  private readonly alterado = signal(false);

  protected readonly podeRevisar = computed(() => this.auth.temPerfil('especialista', 'gestor'));
  protected readonly nomeUsuario = computed(() => this.auth.usuario()?.nome ?? '');
  protected readonly revisaoSalva = computed(() => {
    const p = this.pedido();
    return !!p && p.valor_final !== null && p.horas_finais !== null && !this.alterado();
  });
  protected readonly podeGerar = computed(() => this.podeRevisar() && this.revisaoSalva() && !this.gerando());
  protected readonly mostrarDica = computed(() => this.podeRevisar() && !this.revisaoSalva());
  protected readonly rotuloAmbiente = computed(() => this.rotulo('portes', this.pedido()?.porte_ambiente));
  protected readonly rotuloUrgencia = computed(() => this.rotulo('urgencias', this.pedido()?.urgencia));

  async ngOnInit(): Promise<void> {
    this.form.valueChanges.subscribe(() => {
      if (this.form.dirty) {
        this.alterado.set(true);
        if (this.aviso() === 'salvo') this.aviso.set(null);
      }
    });

    try {
      const [pedido, catalogo] = await Promise.all([this.pedidos.buscar(this.id()), this.catalogoRepo.carregar(true)]);
      this.catalogo.set(catalogo);
      this.definirPedido(pedido);
    } catch {
      this.erroCarga.set(true);
    } finally {
      this.carregando.set(false);
    }
    if (!this.podeRevisar()) this.form.disable({ emitEvent: false });
  }

  protected erro(campo: 'valorFinal' | 'horasFinais' | 'observacoes'): string | null {
    const controle = this.form.controls[campo];
    if (!controle.invalid || !(controle.touched || this.tentou())) return null;
    if (campo === 'valorFinal') return 'Informe um valor final maior que zero, por exemplo 14.000.';
    if (campo === 'horasFinais') return 'Informe as horas finais com um número maior que zero, por exemplo 70.';
    return controle.hasError('marcacao')
      ? 'Remova os caracteres < e > das observações.'
      : 'Use no máximo 1.000 caracteres nas observações.';
  }

  protected async salvar(): Promise<void> {
    const pedido = this.pedido();
    if (!pedido || !this.podeRevisar()) return;
    this.tentou.set(true);
    this.erroAcao.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const primeiro = (['valorFinal', 'horasFinais', 'observacoes'] as const).find((c) => this.form.controls[c].invalid);
      if (primeiro) document.getElementById(primeiro)?.focus();
      return;
    }

    const { valorFinal, horasFinais, observacoes } = this.form.getRawValue();
    this.salvando.set(true);
    try {
      const atualizado = await this.pedidos.revisar(
        pedido.id,
        lerNumeroBR(valorFinal)!,
        lerNumeroBR(horasFinais)!,
        observacoes.trim() || null,
      );
      this.definirPedido(atualizado);
      this.aviso.set('salvo');
    } catch {
      this.erroAcao.set('Não foi possível salvar a revisão. Confira os valores e tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  protected async gerar(): Promise<void> {
    const pedido = this.pedido();
    if (!pedido || !this.podeGerar()) return;
    this.erroAcao.set(null);
    this.gerando.set(true);
    try {
      await this.pdf.gerar({
        pedido,
        rotuloAmbiente: this.rotuloAmbiente(),
        rotuloUrgencia: this.rotuloUrgencia(),
        responsavel: pedido.revisor?.nome ?? this.nomeUsuario(),
      });
      if (!pedido.pdf_gerado_em) {
        this.definirPedido(await this.pedidos.registrarPropostaGerada(pedido.id));
      }
      this.aviso.set('gerado');
    } catch {
      this.erroAcao.set('Não foi possível gerar a proposta. Tente novamente em instantes.');
    } finally {
      this.gerando.set(false);
    }
  }

  protected rotuloPorteEmpresa(p: Pedido): string {
    return ROTULO_PORTE_EMPRESA[p.porte_empresa];
  }

  protected faixaDe(p: Pedido): string {
    return faixa(p.valor_min, p.valor_max);
  }

  protected horasDe(valor: number): string {
    return horas(valor);
  }

  protected quando(iso: string): string {
    return dataHora(iso);
  }

  private definirPedido(pedido: Pedido | null): void {
    this.pedido.set(pedido);
    if (!pedido) return;
    const formatar = (v: number | null) => (v === null ? '' : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
    this.form.reset(
      {
        valorFinal: formatar(pedido.valor_final),
        horasFinais: formatar(pedido.horas_finais),
        observacoes: pedido.observacoes ?? '',
      },
      { emitEvent: false },
    );
    this.alterado.set(false);
  }

  private rotulo(lista: 'portes' | 'urgencias', opcao: string | undefined): string {
    return this.catalogo()?.[lista].find((c) => c.opcao === opcao)?.rotulo ?? opcao ?? '';
  }
}
