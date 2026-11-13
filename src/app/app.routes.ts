import { Routes } from '@angular/router';
import { apenasVisitante, exigirLogin, exigirPerfil } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar | OrçaSec',
    canActivate: [apenasVisitante],
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [exigirLogin],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
      {
        path: 'painel',
        title: 'Painel de pedidos | OrçaSec',
        loadComponent: () => import('./pages/painel/painel').then((m) => m.PainelPage),
      },
      {
        path: 'pedidos/novo',
        title: 'Novo pedido | OrçaSec',
        canActivate: [exigirPerfil('comercial', 'gestor')],
        loadComponent: () => import('./pages/novo-pedido/novo-pedido').then((m) => m.NovoPedidoPage),
      },
      {
        path: 'pedidos/:id',
        title: 'Revisão do pedido | OrçaSec',
        loadComponent: () => import('./pages/revisao/revisao').then((m) => m.RevisaoPage),
      },
      {
        path: 'configuracoes',
        title: 'Configurações | OrçaSec',
        canActivate: [exigirPerfil('gestor')],
        loadComponent: () => import('./pages/configuracoes/configuracoes').then((m) => m.ConfiguracoesPage),
      },
    ],
  },
  { path: '**', redirectTo: 'painel' },
];
