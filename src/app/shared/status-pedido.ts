import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ROTULO_STATUS, StatusPedido } from '../core/modelos';
import { Icone, NomeIcone } from './icone';

const ICONE_STATUS: Record<StatusPedido, NomeIcone> = {
  em_analise: 'relogio',
  proposta_enviada: 'envelope',
  fechado: 'confirmar',
  recusado: 'fechar',
};

/** Status comunicado por texto, ícone e cor ao mesmo tempo (RNF04). */
@Component({
  selector: 'app-status-pedido',
  imports: [Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="selo" [class]="'selo selo--' + status()">
      <app-icone [nome]="icone()" [tamanho]="14" />
      {{ rotulo() }}
    </span>
  `,
})
export class StatusPedidoComponent {
  readonly status = input.required<StatusPedido>();
  protected readonly rotulo = computed(() => ROTULO_STATUS[this.status()]);
  protected readonly icone = computed(() => ICONE_STATUS[this.status()]);
}
