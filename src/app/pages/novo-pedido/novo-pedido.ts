import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DadosTriagem, Pedido, PorteEmpresa, ROTULO_PORTE_EMPRESA } from '../../core/modelos';
import { Catalogo, CatalogoRepository } from '../../data/catalogo.repository';
import { semMarcacao } from '../../domain/validacao';
import { OrcamentoService } from '../../services/orcamento.service';
import { Cabecalho } from '../../shared/cabecalho';
import { faixa, horas } from '../../shared/formatos';
import { Icone } from '../../shared/icone';
import { StatusPedidoComponent } from '../../shared/status-pedido';

type Campo = 'cliente' | 'porteEmpresa' | 'tipoServico' | 'porteAmbiente' | 'urgencia';

const ORDEM_CAMPOS: Campo[] = ['cliente', 'porteEmpresa', 'tipoServico', 'porteAmbiente', 'urgencia'];

const MENSAGENS: Record<Campo, string> = {
  cliente: 'Informe o nome do cliente para registrar o pedido.',
  porteEmpresa: 'Selecione o porte da empresa: pequena, média ou grande.',
  tipoServico: 'Selecione o tipo de serviço solicitado.',
  porteAmbiente: 'Informe o porte do ambiente para calcular a estimativa.',
  urgencia: 'Selecione a urgência do pedido: normal ou alta.',
};

/** Tela 2 – Novo pedido e cálculo da estimativa (RF02, RF03). */
@Component({
  selector: 'app-novo-pedido',
  imports: [ReactiveFormsModule, RouterLink, Cabecalho, Icone, StatusPedidoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .rotulo-dado { font-size: 14px; font-weight: 600; color: var(--texto-suave); }
    .faixa { font-size: 28px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.25; }
    .horas { font-size: 20px; font-weight: 600; }
    .memoria { font-size: 13px; color: var(--texto-suave); padding: 10px 12px; background: #f9fafb; border-radius: var(--raio); }
  `,
  template: `
    <app-cabecalho secao="novo" />
    <main class="pagina">
      <a routerLink="/painel" class="link-voltar"><app-icone nome="voltar" /> Voltar ao painel</a>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <h1 class="titulo">Novo pedido de orçamento</h1>
        <p class="texto-suave">Registre os dados da triagem. A estimativa é calculada automaticamente com base nas regras da empresa.</p>
      </div>

      @if (erroCatalogo()) {
        <div class="alerta alerta--erro" role="alert">
          <app-icone nome="alerta" [tamanho]="20" />
          <span>Não foi possível carregar os serviços cadastrados. Atualize a página para tentar de novo.</span>
        </div>
      }

      <div class="colunas">
        <form class="card colunas__principal" [formGroup]="form" (ngSubmit)="calcular()" novalidate aria-labelledby="titulo-triagem">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h2 id="titulo-triagem" class="titulo-secao">Dados da triagem</h2>
            <p class="texto-suave texto-pequeno">Todos os campos são obrigatórios.</p>
          </div>

          @if (tentou() && form.invalid) {
            <div class="alerta alerta--erro" role="alert">
              <app-icone nome="alerta" [tamanho]="20" />
              <span>Não foi possível calcular a estimativa. Corrija os campos destacados abaixo.</span>
            </div>
          }
          @if (erroGravacao()) {
            <div class="alerta alerta--erro" role="alert">
              <app-icone nome="alerta" [tamanho]="20" />
              <span>Não foi possível registrar o pedido. Confira os dados e tente novamente em instantes.</span>
            </div>
          }

          <div class="campo">
            <label for="cliente" class="campo__rotulo">Nome do cliente</label>
            <input id="cliente" type="text" class="campo__controle" formControlName="cliente" maxlength="120" autocomplete="off"
                   [attr.aria-invalid]="erro('cliente') ? 'true' : null"
                   [attr.aria-describedby]="erro('cliente') ? 'erro-cliente' : null">
            @if (erro('cliente'); as msg) {
              <p id="erro-cliente" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
            }
          </div>

          <div class="grade-2">
            <div class="campo">
              <label for="porteEmpresa" class="campo__rotulo">Porte da empresa</label>
              <select id="porteEmpresa" class="campo__controle" formControlName="porteEmpresa"
                      [attr.aria-invalid]="erro('porteEmpresa') ? 'true' : null"
                      [attr.aria-describedby]="erro('porteEmpresa') ? 'erro-porteEmpresa' : null">
                <option value="">Selecione</option>
                @for (opcao of portesEmpresa; track opcao.valor) {
                  <option [value]="opcao.valor">{{ opcao.rotulo }}</option>
                }
              </select>
              @if (erro('porteEmpresa'); as msg) {
                <p id="erro-porteEmpresa" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
              }
            </div>

            <div class="campo">
              <label for="tipoServico" class="campo__rotulo">Tipo de serviço</label>
              <select id="tipoServico" class="campo__controle" formControlName="tipoServico"
                      [attr.aria-invalid]="erro('tipoServico') ? 'true' : null"
                      [attr.aria-describedby]="erro('tipoServico') ? 'erro-tipoServico' : null">
                <option value="">Selecione</option>
                @for (tipo of catalogo()?.tipos ?? []; track tipo.id) {
                  <option [value]="tipo.id">{{ tipo.nome }}</option>
                }
              </select>
              @if (erro('tipoServico'); as msg) {
                <p id="erro-tipoServico" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
              }
            </div>

            <div class="campo">
              <label for="porteAmbiente" class="campo__rotulo">Porte do ambiente</label>
              <select id="porteAmbiente" class="campo__controle" formControlName="porteAmbiente"
                      [attr.aria-invalid]="erro('porteAmbiente') ? 'true' : null"
                      [attr.aria-describedby]="erro('porteAmbiente') ? 'erro-porteAmbiente' : null">
                <option value="">Selecione</option>
                @for (opcao of catalogo()?.portes ?? []; track opcao.id) {
                  <option [value]="opcao.opcao">{{ opcao.rotulo }}</option>
                }
              </select>
              @if (erro('porteAmbiente'); as msg) {
                <p id="erro-porteAmbiente" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
              }
            </div>

            <div class="campo">
              <label for="urgencia" class="campo__rotulo">Urgência</label>
              <select id="urgencia" class="campo__controle" formControlName="urgencia"
                      [attr.aria-invalid]="erro('urgencia') ? 'true' : null"
                      [attr.aria-describedby]="erro('urgencia') ? 'erro-urgencia' : null">
                <option value="">Selecione</option>
                @for (opcao of catalogo()?.urgencias ?? []; track opcao.id) {
                  <option [value]="opcao.opcao">{{ opcao.rotulo }}</option>
                }
              </select>
              @if (erro('urgencia'); as msg) {
                <p id="erro-urgencia" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
              }
            </div>
          </div>

          <div class="acoes" style="padding-top: 4px;">
            @if (resultado()) {
              <button type="button" class="botao botao--primario" (click)="novoRegistro()">Registrar outro pedido</button>
            } @else {
              <button type="submit" class="botao botao--primario" [disabled]="salvando() || !catalogo()">
                {{ salvando() ? 'Calculando…' : 'Calcular estimativa' }}
              </button>
              <a routerLink="/painel" class="botao botao--neutro">Cancelar</a>
            }
          </div>
        </form>

        <section class="card colunas__lateral" aria-labelledby="titulo-resultado">
          <h2 id="titulo-resultado" class="titulo-secao">Estimativa</h2>
          @if (resultado(); as r) {
            <div role="status" class="alerta alerta--sucesso">
              <app-icone nome="confirmar" [tamanho]="20" />
              <span>Pedido registrado e encaminhado para revisão técnica.</span>
            </div>
            <div>
              <p class="rotulo-dado">Faixa estimada</p>
              <p class="faixa">{{ r.faixa }}</p>
            </div>
            <div>
              <p class="rotulo-dado">Horas estimadas</p>
              <p class="horas">{{ r.horas }}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start;">
              <p class="rotulo-dado">Status</p>
              <app-status-pedido [status]="r.pedido.status" />
            </div>
            <p class="memoria">{{ r.memoria }}</p>
            <a routerLink="/painel" class="botao botao--primario">Ver no painel</a>
          } @else {
            <p class="texto-suave">Preencha os dados da triagem e clique em “Calcular estimativa”. A faixa de preço e as horas estimadas aparecerão aqui.</p>
          }
        </section>
      </div>
    </main>
  `,
})
export class NovoPedidoPage implements OnInit {
  private readonly catalogoRepo = inject(CatalogoRepository);
  private readonly orcamento = inject(OrcamentoService);

  protected readonly portesEmpresa = (Object.keys(ROTULO_PORTE_EMPRESA) as PorteEmpresa[]).map((valor) => ({
    valor,
    rotulo: ROTULO_PORTE_EMPRESA[valor],
  }));

  protected readonly form = inject(FormBuilder).nonNullable.group({
    cliente: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120), semMarcacao()]],
    porteEmpresa: ['', Validators.required],
    tipoServico: ['', Validators.required],
    porteAmbiente: ['', Validators.required],
    urgencia: ['', Validators.required],
  });

  protected readonly catalogo = signal<Catalogo | null>(null);
  protected readonly erroCatalogo = signal(false);
  protected readonly tentou = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erroGravacao = signal(false);
  protected readonly resultado = signal<{ pedido: Pedido; faixa: string; horas: string; memoria: string } | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.catalogo.set(await this.catalogoRepo.carregar());
    } catch {
      this.erroCatalogo.set(true);
    }
  }

  protected erro(campo: Campo): string | null {
    const controle = this.form.controls[campo];
    if (!controle.invalid || !(controle.touched || this.tentou())) return null;
    if (campo === 'cliente') {
      if (controle.hasError('marcacao')) return 'Remova os caracteres < e > do nome do cliente.';
      if (controle.hasError('minlength')) return 'Informe o nome do cliente com pelo menos 2 caracteres.';
    }
    return MENSAGENS[campo];
  }

  protected async calcular(): Promise<void> {
    this.tentou.set(true);
    this.erroGravacao.set(false);
    const catalogo = this.catalogo();
    if (this.form.invalid || !catalogo) {
      this.form.markAllAsTouched();
      const primeiro = ORDEM_CAMPOS.find((c) => this.form.controls[c].invalid);
      if (primeiro) document.getElementById(primeiro)?.focus();
      return;
    }

    const valores = this.form.getRawValue();
    const dados: DadosTriagem = {
      nome_cliente: valores.cliente.trim(),
      porte_empresa: valores.porteEmpresa as PorteEmpresa,
      tipo_servico_id: Number(valores.tipoServico),
      porte_ambiente: valores.porteAmbiente,
      urgencia: valores.urgencia,
    };

    this.salvando.set(true);
    try {
      const { pedido, memoria } = await this.orcamento.registrar(catalogo, dados);
      this.resultado.set({
        pedido,
        faixa: faixa(pedido.valor_min, pedido.valor_max),
        horas: horas(pedido.horas_estimadas),
        memoria,
      });
      this.form.disable();
    } catch {
      this.erroGravacao.set(true);
    } finally {
      this.salvando.set(false);
    }
  }

  protected novoRegistro(): void {
    this.resultado.set(null);
    this.tentou.set(false);
    this.form.enable();
    this.form.reset();
    document.getElementById('cliente')?.focus();
  }
}
