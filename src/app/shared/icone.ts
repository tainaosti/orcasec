import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NomeIcone =
  | 'escudo' | 'mais' | 'voltar' | 'relogio' | 'envelope' | 'confirmar'
  | 'fechar' | 'alerta' | 'info' | 'cadeado' | 'pdf';

/** Ícones em SVG embutido. São decorativos: o texto ao lado carrega o sentido. */
@Component({
  selector: 'app-icone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'icone' },
  template: `
    <svg [attr.width]="tamanho()" [attr.height]="tamanho()" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (nome()) {
        @case ('escudo') { <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/> }
        @case ('mais') { <path d="M12 5v14"/><path d="M5 12h14"/> }
        @case ('voltar') { <path d="M15 6l-6 6 6 6"/> }
        @case ('relogio') { <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/> }
        @case ('envelope') { <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/> }
        @case ('confirmar') { <path d="M5 12l5 5L20 7"/> }
        @case ('fechar') { <path d="M6 6l12 12"/><path d="M18 6L6 18"/> }
        @case ('alerta') { <circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/> }
        @case ('info') { <circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/> }
        @case ('cadeado') { <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/> }
        @case ('pdf') { <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 12v6"/><path d="M9 15l3 3 3-3"/> }
      }
    </svg>
  `,
})
export class Icone {
  readonly nome = input.required<NomeIcone>();
  readonly tamanho = input(18);
}
