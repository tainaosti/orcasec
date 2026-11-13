import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SupabaseService } from '../../core/supabase.service';
import { Icone } from '../../shared/icone';

/** Tela de login (RF01, RNF01). */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .login { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .login__card { width: 100%; max-width: 420px; }
    .login__marca { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 20px; color: var(--texto); }
  `,
  template: `
    <main class="login">
      <section class="card login__card" aria-labelledby="titulo-login">
        <div class="login__marca"><app-icone nome="escudo" [tamanho]="26" /> OrçaSec</div>
        <div>
          <h1 id="titulo-login" class="titulo">Entrar</h1>
          <p class="texto-suave">Use o e-mail e a senha cadastrados pelo gestor da empresa.</p>
        </div>

        @if (!configurado) {
          <div class="alerta alerta--aviso" role="alert">
            <app-icone nome="alerta" [tamanho]="20" />
            <span>O sistema ainda não foi configurado. Preencha os dados do Supabase seguindo o README do projeto.</span>
          </div>
        }

        @if (mensagemErro()) {
          <div class="alerta alerta--erro" role="alert">
            <app-icone nome="alerta" [tamanho]="20" />
            <span>{{ mensagemErro() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="entrar()" novalidate class="card" style="padding: 0; border: 0; gap: 18px;">
          <div class="campo">
            <label for="email" class="campo__rotulo">E-mail</label>
            <input id="email" type="email" class="campo__controle" formControlName="email" autocomplete="username"
                   [attr.aria-invalid]="erro('email') ? 'true' : null"
                   [attr.aria-describedby]="erro('email') ? 'erro-email' : null">
            @if (erro('email'); as msg) {
              <p id="erro-email" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
            }
          </div>

          <div class="campo">
            <label for="senha" class="campo__rotulo">Senha</label>
            <input id="senha" type="password" class="campo__controle" formControlName="senha" autocomplete="current-password"
                   [attr.aria-invalid]="erro('senha') ? 'true' : null"
                   [attr.aria-describedby]="erro('senha') ? 'erro-senha' : null">
            @if (erro('senha'); as msg) {
              <p id="erro-senha" class="campo__erro"><app-icone nome="alerta" [tamanho]="16" />{{ msg }}</p>
            }
          </div>

          <button type="submit" class="botao botao--primario" [disabled]="enviando()">
            {{ enviando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </section>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly configurado = inject(SupabaseService).configurado;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });
  protected readonly enviando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  private readonly tentou = signal(false);

  protected erro(campo: 'email' | 'senha'): string | null {
    const controle = this.form.controls[campo];
    if (!controle.invalid || !(controle.touched || this.tentou())) return null;
    if (campo === 'email') {
      return controle.hasError('required') ? 'Informe seu e-mail.' : 'Informe um e-mail válido, como nome@empresa.com.br.';
    }
    return 'Informe sua senha.';
  }

  protected async entrar(): Promise<void> {
    this.tentou.set(true);
    this.mensagemErro.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      document.getElementById(this.form.controls.email.invalid ? 'email' : 'senha')?.focus();
      return;
    }

    this.enviando.set(true);
    const { email, senha } = this.form.getRawValue();
    const resultado = await this.auth.entrar(email, senha);
    this.enviando.set(false);

    if (resultado === 'ok') {
      await this.router.navigateByUrl('/painel');
      return;
    }
    // Mensagem genérica: não indica se o erro está no e-mail ou na senha.
    const mensagens = {
      credenciais: 'E-mail ou senha inválidos.',
      muitas_tentativas: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
      indisponivel: 'Não foi possível entrar agora. Tente novamente em instantes.',
    } as const;
    this.mensagemErro.set(mensagens[resultado]);
    this.form.controls.senha.reset();
  }
}
