import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Configuracao, TipoServico } from '../../core/modelos';
import { CatalogoRepository } from '../../data/catalogo.repository';
import { lerNumeroBR, numeroEntre, numeroPositivo } from '../../domain/validacao';
import { Cabecalho } from '../../shared/cabecalho';
import { numero } from '../../shared/formatos';
import { Icone } from '../../shared/icone';

type Secao = 'servicos' | 'fatores';

/** Configuração das regras de cálculo pelo gestor (RF07). */
@Component({
  selector: 'app-configuracoes',
  imports: [ReactiveFormsModule, Cabecalho, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .linha-config { display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 16px; align-items: end; padding-top: 16px; border-top: 1px solid var(--borda); }
    .linha-fator { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: end; padding-top: 16px; border-top: 1px solid var(--borda); }
    .nome-item { font-weight: 600; min-height: 44px; display: flex; align-items: center; }
    .ativo { display: flex; align-items: center; gap: 8px; min-height: 44px; font-weight: 500; }
    .ativo input { width: 20px; height: 20px; }
    @media (max-width: 720px) { .linha-config, .linha-fator { grid-template-columns: minmax(0, 1fr); } }
  `,
  template: `
    <app-cabecalho secao="configuracoes" />
    <main class="pagina">
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <h1 class="titulo">Configurações de cálculo</h1>
        <p class="texto-suave">Ajuste os valores usados na estimativa. As mudanças valem para os próximos pedidos; os já registrados mantêm os valores da época.</p>
      </div>

      @if (carregando()) {
        <p class="texto-suave" role="status">Carregando configurações…</p>
      } @else if (erroCarga()) {
        <div class="alerta alerta--erro" role="alert">
          <app-icone nome="alerta" [tamanho]="20" />
          <span>Não foi possível carregar as configurações. Atualize a página para tentar de novo.</span>
        </div>
      } @else {
        <form class="card" [formGroup]="formServicos" (ngSubmit)="salvarServicos()" novalidate aria-labelledby="titulo-servicos">
          <h2 id="titulo-servicos" class="titulo-secao">Tipos de serviço</h2>
          @if (mensagem().servicos; as m) {
            <div [attr.role]="m.tipo === 'sucesso' ? 'status' : 'alert'" class="alerta" [class.alerta--sucesso]="m.tipo === 'sucesso'" [class.alerta--erro]="m.tipo === 'erro'">
              <app-icone [nome]="m.tipo === 'sucesso' ? 'confirmar' : 'alerta'" [tamanho]="20" />
              <span>{{ m.texto }}</span>
            </div>
          }
          <div formArrayName="itens" style="display: flex; flex-direction: column; gap: 16px;">
            @for (grupo of itensServicos.controls; track tipos()[$index].id; let i = $index) {
              <div class="linha-config" [formGroupName]="i">
                <p class="nome-item">{{ tipos()[i].nome }}</p>
                <div class="campo">
                  <label class="campo__rotulo" [for]="'valor-' + i">Valor por hora (R$)</label>
                  <input class="campo__controle" type="text" inputmode="decimal" [id]="'valor-' + i" formControlName="valorHora"
                         [attr.aria-invalid]="invalido(grupo, 'valorHora') ? 'true' : null"
                         [attr.aria-describedby]="invalido(grupo, 'valorHora') ? 'erro-valor-' + i : null">
                  @if (invalido(grupo, 'valorHora')) {
                    <p class="campo__erro" [id]="'erro-valor-' + i"><app-icone nome="alerta" [tamanho]="16" />Informe um valor maior que zero.</p>
                  }
                </div>
                <div class="campo">
                  <label class="campo__rotulo" [for]="'horas-' + i">Horas base</label>
                  <input class="campo__controle" type="text" inputmode="decimal" [id]="'horas-' + i" formControlName="horasBase"
                         [attr.aria-invalid]="invalido(grupo, 'horasBase') ? 'true' : null"
                         [attr.aria-describedby]="invalido(grupo, 'horasBase') ? 'erro-horas-' + i : null">
                  @if (invalido(grupo, 'horasBase')) {
                    <p class="campo__erro" [id]="'erro-horas-' + i"><app-icone nome="alerta" [tamanho]="16" />Informe um número de horas maior que zero.</p>
                  }
                </div>
                <label class="ativo"><input type="checkbox" formControlName="ativo"> Ativo</label>
              </div>
            }
          </div>
          <div class="acoes">
            <button type="submit" class="botao botao--primario" [disabled]="salvando() === 'servicos'">
              {{ salvando() === 'servicos' ? 'Salvando…' : 'Salvar tipos de serviço' }}
            </button>
          </div>
        </form>

        <form class="card" [formGroup]="formFatores" (ngSubmit)="salvarFatores()" novalidate aria-labelledby="titulo-fatores">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h2 id="titulo-fatores" class="titulo-secao">Fatores de cálculo</h2>
            <p class="texto-suave texto-pequeno">Os fatores multiplicam as horas base. A margem define a faixa de preço para mais e para menos.</p>
          </div>
          @if (mensagem().fatores; as m) {
            <div [attr.role]="m.tipo === 'sucesso' ? 'status' : 'alert'" class="alerta" [class.alerta--sucesso]="m.tipo === 'sucesso'" [class.alerta--erro]="m.tipo === 'erro'">
              <app-icone [nome]="m.tipo === 'sucesso' ? 'confirmar' : 'alerta'" [tamanho]="20" />
              <span>{{ m.texto }}</span>
            </div>
          }
          <div formArrayName="itens" style="display: flex; flex-direction: column; gap: 16px;">
            @for (grupo of itensFatores.controls; track fatores()[$index].id; let i = $index) {
              <div class="linha-fator" [formGroupName]="i">
                <p class="nome-item">{{ descricaoFator(fatores()[i]) }}</p>
                <div class="campo">
                  <label class="campo__rotulo" [for]="'fator-' + i">{{ fatores()[i].categoria === 'margem' ? 'Margem (%)' : 'Fator' }}</label>
                  <input class="campo__controle" type="text" inputmode="decimal" [id]="'fator-' + i" formControlName="fator"
                         [attr.aria-invalid]="invalido(grupo, 'fator') ? 'true' : null"
                         [attr.aria-describedby]="invalido(grupo, 'fator') ? 'erro-fator-' + i : null">
                  @if (invalido(grupo, 'fator')) {
                    <p class="campo__erro" [id]="'erro-fator-' + i"><app-icone nome="alerta" [tamanho]="16" />
                      {{ fatores()[i].categoria === 'margem' ? 'Informe uma margem entre 0 e 99.' : 'Informe um fator maior que zero, por exemplo 1,5.' }}</p>
                  }
                </div>
              </div>
            }
          </div>
          <div class="acoes">
            <button type="submit" class="botao botao--primario" [disabled]="salvando() === 'fatores'">
              {{ salvando() === 'fatores' ? 'Salvando…' : 'Salvar fatores' }}
            </button>
          </div>
        </form>
      }
    </main>
  `,
})
export class ConfiguracoesPage implements OnInit {
  private readonly repositorio = inject(CatalogoRepository);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly tipos = signal<TipoServico[]>([]);
  protected readonly fatores = signal<Configuracao[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erroCarga = signal(false);
  protected readonly salvando = signal<Secao | null>(null);
  protected readonly mensagem = signal<Partial<Record<Secao, { tipo: 'sucesso' | 'erro'; texto: string }>>>({});
  private readonly tentou = signal<Record<Secao, boolean>>({ servicos: false, fatores: false });

  protected readonly formServicos = this.fb.group({ itens: this.fb.array<FormGroup>([]) });
  protected readonly formFatores = this.fb.group({ itens: this.fb.array<FormGroup>([]) });

  protected get itensServicos(): FormArray<FormGroup> {
    return this.formServicos.controls.itens;
  }

  protected get itensFatores(): FormArray<FormGroup> {
    return this.formFatores.controls.itens;
  }

  async ngOnInit(): Promise<void> {
    try {
      const catalogo = await this.repositorio.carregar(true);
      this.tipos.set(catalogo.tipos);
      this.fatores.set([...catalogo.portes, ...catalogo.urgencias, ...(catalogo.margem ? [catalogo.margem] : [])]);
      for (const t of catalogo.tipos) {
        this.itensServicos.push(
          this.fb.group({
            valorHora: [numero(t.valor_hora), [Validators.required, numeroPositivo()]],
            horasBase: [numero(t.horas_base), [Validators.required, numeroPositivo()]],
            ativo: [t.ativo],
          }),
        );
      }
      for (const c of this.fatores()) {
        const ehMargem = c.categoria === 'margem';
        this.itensFatores.push(
          this.fb.group({
            fator: [
              numero(ehMargem ? Math.round(c.fator * 100) : c.fator),
              [Validators.required, ehMargem ? numeroEntre(0, 99) : numeroPositivo()],
            ],
          }),
        );
      }
    } catch {
      this.erroCarga.set(true);
    } finally {
      this.carregando.set(false);
    }
  }

  protected descricaoFator(c: Configuracao): string {
    if (c.categoria === 'margem') return 'Margem da faixa de preço';
    return `${c.categoria === 'porte' ? 'Porte do ambiente' : 'Urgência'}: ${c.rotulo.toLowerCase()}`;
  }

  protected invalido(grupo: FormGroup, campo: string): boolean {
    const controle = grupo.get(campo);
    const secao: Secao = campo === 'fator' ? 'fatores' : 'servicos';
    return !!controle && controle.invalid && (controle.touched || this.tentou()[secao]);
  }

  protected async salvarServicos(): Promise<void> {
    if (!this.validar('servicos', this.formServicos)) return;
    const itens = this.itensServicos.getRawValue().map((v, i) => ({
      id: this.tipos()[i].id,
      valor_hora: lerNumeroBR(v['valorHora'])!,
      horas_base: lerNumeroBR(v['horasBase'])!,
      ativo: !!v['ativo'],
    }));
    await this.executar('servicos', () => this.repositorio.salvarTipos(itens));
  }

  protected async salvarFatores(): Promise<void> {
    if (!this.validar('fatores', this.formFatores)) return;
    const itens = this.itensFatores.getRawValue().map((v, i) => {
      const config = this.fatores()[i];
      const valor = lerNumeroBR(v['fator'])!;
      return { id: config.id, fator: config.categoria === 'margem' ? valor / 100 : valor };
    });
    await this.executar('fatores', () => this.repositorio.salvarFatores(itens));
  }

  private validar(secao: Secao, form: FormGroup): boolean {
    this.tentou.update((t) => ({ ...t, [secao]: true }));
    this.mensagem.update((m) => ({ ...m, [secao]: undefined }));
    if (form.valid) return true;
    form.markAllAsTouched();
    this.mensagem.update((m) => ({ ...m, [secao]: { tipo: 'erro', texto: 'Corrija os campos destacados antes de salvar.' } }));
    return false;
  }

  private async executar(secao: Secao, acao: () => Promise<void>): Promise<void> {
    this.salvando.set(secao);
    try {
      await acao();
      this.mensagem.update((m) => ({
        ...m,
        [secao]: { tipo: 'sucesso', texto: 'Alterações salvas. Os próximos pedidos já usam os novos valores.' },
      }));
    } catch {
      this.mensagem.update((m) => ({
        ...m,
        [secao]: { tipo: 'erro', texto: 'Não foi possível salvar as alterações. Tente novamente em instantes.' },
      }));
    } finally {
      this.salvando.set(null);
    }
  }
}
