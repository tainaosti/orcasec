import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Perfil } from './modelos';
import { AuthService } from './auth.service';

/** Só deixa entrar quem está autenticado e ativo. */
export const exigirLogin: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.pronto;
  return auth.usuario() ? true : router.parseUrl('/login');
};

/** Leva para o painel quem já está autenticado e abre a tela de login. */
export const apenasVisitante: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.pronto;
  return auth.usuario() ? router.parseUrl('/painel') : true;
};

/**
 * Restringe uma tela a alguns perfis. Serve apenas para a navegação:
 * a proteção real fica nas políticas de segurança do banco (RLS).
 */
export function exigirPerfil(...perfis: Perfil[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.pronto;
    return auth.temPerfil(...perfis) ? true : router.parseUrl('/painel');
  };
}
