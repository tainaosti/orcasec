# OrçaSec – Sistema de Orçamentos para a Katrinasec

Ferramenta web interna que automatiza a montagem de orçamentos da Katrinasec, empresa de segurança ofensiva de São Paulo. A equipe comercial registra os dados da triagem, o sistema calcula automaticamente a faixa de preço e as horas estimadas, o especialista revisa os valores e a proposta é gerada em PDF.

Projeto desenvolvido para a disciplina de Projeto de Software, vinculado ao **ODS 9 – Indústria, Inovação e Infraestrutura**.

## Funcionalidades

| Requisito | Descrição | Onde está |
|---|---|---|
| RF01 | Login com e-mail e senha, menu conforme o perfil | `pages/login`, `core/auth.service.ts`, `core/guards.ts` |
| RF02 | Registro do pedido com dados da triagem | `pages/novo-pedido` |
| RF03 | Cálculo automático da faixa de preço e das horas | `domain/servico.ts`, `services/orcamento.service.ts` |
| RF04 | Painel com lista de pedidos e status | `pages/painel` |
| RF05 | Revisão do especialista | `pages/revisao` |
| RF06 | Geração da proposta em PDF | `services/proposta-pdf.service.ts` |
| RF07 | Configuração de serviços e fatores pelo gestor | `pages/configuracoes` |
| RF08 | Filtros por porte da empresa e mês | `pages/painel` |

Perfis de acesso: **comercial** (registra pedidos), **especialista** (revisa e gera propostas) e **gestor** (faz tudo e altera as configurações).

## Tecnologias (todas gratuitas)

- **Angular 22** com TypeScript e Reactive Forms (interface e regras de negócio)
- **Supabase** (PostgreSQL gerenciado + autenticação), via `@supabase/supabase-js`
- **jsPDF** (geração do PDF no navegador)
- **Vitest** (testes unitários, integrado ao Angular CLI)
- **Vercel** (hospedagem)
- **Node.js 22 LTS**

## Arquitetura

Monolito em camadas:

```
src/app/
├── pages/        Apresentação: telas (login, painel, novo pedido, revisão, configurações)
├── shared/       Apresentação: cabeçalho, ícones, selo de status, formatação
├── services/     Lógica de negócio: orquestração do orçamento e geração do PDF
├── domain/       Lógica de negócio: classe Servico e subclasses (POO), validações
├── data/         Dados: repositórios que acessam o Supabase
└── core/         Modelos, cliente Supabase, autenticação e guardas de rota
supabase/
├── schema.sql    Tabelas, restrições, gatilhos e políticas de segurança (RLS)
└── seed.sql      Serviços e fatores iniciais (valores de exemplo)
```

O cálculo é feito no navegador (para exibição) e **recalculado no banco** por um gatilho antes de gravar. Assim, mesmo que alguém envie valores alterados pela API, o banco ignora e usa as regras cadastradas.

## Como rodar

### 1. Criar o banco no Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Em seguida, execute `supabase/seed.sql`.
4. Em **Authentication > Sign In / Providers > Email**, desative o cadastro público (*Allow new users to sign up*) e defina senha mínima de 8 caracteres com letras e números.
5. Em **Authentication > Users**, use **Invite user** para convidar cada pessoa da equipe. Todo usuário novo começa como `comercial`.
6. Para mudar o perfil, abra **Table Editor > usuarios** e altere a coluna `perfil` para `especialista` ou `gestor`.

> Opcional: o final do `seed.sql` tem pedidos fictícios de demonstração (comentados). Rode depois de criar pelo menos um usuário.

### 2. Configurar o front-end

```bash
npm ci
cp src/environments/environment.example.ts src/environments/environment.ts
```

Preencha `src/environments/environment.ts` com a **Project URL** e a chave **anon public** (em *Project Settings > API*).

> Use somente a chave `anon`. **Nunca** coloque a chave `service_role` no front-end ou no repositório. O arquivo `environment.ts` está no `.gitignore`.

### 3. Rodar

```bash
npm start          # abre em http://localhost:4200
npm test           # testes unitários (cálculo e validações)
npm run build      # versão de produção em dist/orcasec/browser
npm audit          # verificação de vulnerabilidades nas dependências
```

## Publicar na Vercel

1. Importe o repositório na Vercel.
2. Em *Settings > Environment Variables*, crie `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
3. Faça o deploy. O script `scripts/gerar-env.mjs` gera a configuração a partir dessas variáveis, e o `vercel.json` aplica as rotas e os cabeçalhos de segurança (CSP).

> O plano gratuito da Vercel é para uso não comercial, adequado ao protótipo. Para uso contínuo pela empresa, a pasta `dist/orcasec/browser` pode ser publicada em outro serviço estático gratuito que permita uso comercial.

## Segurança (OWASP)

- **Autenticação:** Supabase Auth, senhas com hash bcrypt, cadastro público desativado, mensagens de login genéricas, limite de tentativas nativo.
- **Controle de acesso:** políticas de Row Level Security por perfil em todas as tabelas; ninguém exclui pedidos; usuários inativos não acessam dados.
- **Injeção de SQL:** consultas parametrizadas pelo cliente do Supabase e restrições no banco (tipos, valores permitidos, números positivos).
- **XSS:** saída sempre por interpolação do Angular, sem `innerHTML`; caracteres `<` e `>` rejeitados no formulário e no banco; CSP configurada.
- **Segredos:** apenas a chave pública no front-end; configuração local fora do Git.
- **Dependências:** versões travadas no `package-lock.json`.

## Acessibilidade

Rótulos associados a todos os campos, navegação completa por teclado com foco visível, mensagens de erro que explicam a correção, status comunicados por texto + ícone + cor, contraste mínimo de 4,5:1 e área de toque mínima de 44 × 44 px.

## Testes

`npm test` executa os testes de `src/app/domain`, incluindo o caso documentado no RF03: valor por hora de R$ 200, 40 horas base, porte médio (1,5), urgência alta (1,2) e margem de 10% resultam em **72 horas** e faixa de **R$ 12.960 a R$ 15.840**.
