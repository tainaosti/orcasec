-- =====================================================================
-- OrçaSec – Estrutura do banco de dados (PostgreSQL / Supabase)
-- Execute este arquivo inteiro no SQL Editor do Supabase, uma única vez.
-- Depois execute o arquivo seed.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------

-- Perfil dos membros da equipe. O login em si (e-mail e senha com hash
-- bcrypt) fica no Supabase Auth, na tabela auth.users.
create table public.usuarios (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (char_length(btrim(nome)) between 2 and 120),
  email      text not null unique,
  perfil     text not null default 'comercial'
             check (perfil in ('comercial', 'especialista', 'gestor')),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- Serviços oferecidos e seus valores de referência para o cálculo.
create table public.tipos_servico (
  id            integer generated always as identity primary key,
  codigo        text not null unique check (codigo ~ '^[a-z_]{2,30}$'),
  nome          text not null unique check (char_length(btrim(nome)) between 2 and 80),
  descricao     text,
  valor_hora    numeric(10, 2) not null check (valor_hora > 0),
  horas_base    numeric(6, 1)  not null check (horas_base > 0),
  ativo         boolean not null default true,
  atualizado_em timestamptz not null default now()
);

-- Multiplicadores de porte do ambiente e urgência, e a margem da faixa.
create table public.configuracoes (
  id         integer generated always as identity primary key,
  categoria  text not null check (categoria in ('porte', 'urgencia', 'margem')),
  opcao      text not null check (opcao ~ '^[a-z_]{2,30}$'),
  rotulo     text not null,
  fator      numeric(5, 2) not null check (fator > 0),
  ordem      smallint not null default 0,
  unique (categoria, opcao),
  -- a margem é um percentual: 0,10 = 10% para mais e para menos
  check (categoria <> 'margem' or fator < 1)
);

-- Pedidos de orçamento registrados pela equipe comercial.
create table public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  nome_cliente     text not null
                   check (char_length(btrim(nome_cliente)) between 2 and 120
                          and nome_cliente !~ '[<>]'),
  porte_empresa    text not null check (porte_empresa in ('pequena', 'media', 'grande')),
  tipo_servico_id  integer not null references public.tipos_servico (id),
  porte_ambiente   text not null,
  urgencia         text not null,
  valor_min        numeric(12, 2) not null check (valor_min >= 0),
  valor_max        numeric(12, 2) not null,
  horas_estimadas  numeric(7, 1)  not null check (horas_estimadas > 0),
  valor_final      numeric(12, 2) check (valor_final > 0),
  horas_finais     numeric(7, 1)  check (horas_finais > 0),
  observacoes      text check (observacoes is null
                               or (char_length(observacoes) <= 1000 and observacoes !~ '[<>]')),
  status           text not null default 'em_analise'
                   check (status in ('em_analise', 'proposta_enviada', 'fechado', 'recusado')),
  criado_por       uuid not null references public.usuarios (id),
  revisado_por     uuid references public.usuarios (id),
  criado_em        timestamptz not null default now(),
  pdf_gerado_em    timestamptz,
  check (valor_max >= valor_min),
  check (pdf_gerado_em is null or (valor_final is not null and horas_finais is not null))
);

-- Índices usados pelo painel (ordenação por data e filtros).
create index pedidos_criado_em_idx on public.pedidos (criado_em desc);
create index pedidos_status_idx    on public.pedidos (status);
create index pedidos_porte_idx     on public.pedidos (porte_empresa);

-- ---------------------------------------------------------------------
-- 2. Funções auxiliares e gatilhos
-- ---------------------------------------------------------------------

-- Perfil do usuário autenticado (nulo se não existir ou estiver inativo).
create or replace function public.perfil_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select perfil from public.usuarios where id = auth.uid() and ativo;
$$;

-- Cria automaticamente o perfil quando o gestor convida um novo usuário.
-- Todo usuário novo começa como "comercial"; o gestor ajusta depois.
create or replace function public.criar_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, perfil)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    'comercial'
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_usuario();

-- Cálculo oficial da estimativa, feito no próprio banco.
-- Mesmo que alguém envie valores alterados pela API, eles são ignorados
-- e recalculados a partir das regras cadastradas.
create or replace function public.calcular_estimativa_pedido()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  servico   record;
  f_porte   numeric;
  f_urg     numeric;
  margem    numeric;
  horas     numeric;
  valor     numeric;
begin
  select valor_hora, horas_base into servico
    from public.tipos_servico
   where id = new.tipo_servico_id and ativo;
  if not found then
    raise exception 'Tipo de serviço inválido ou inativo.' using errcode = '22023';
  end if;

  select fator into f_porte from public.configuracoes
   where categoria = 'porte' and opcao = new.porte_ambiente;
  if f_porte is null then
    raise exception 'Porte do ambiente inválido.' using errcode = '22023';
  end if;

  select fator into f_urg from public.configuracoes
   where categoria = 'urgencia' and opcao = new.urgencia;
  if f_urg is null then
    raise exception 'Urgência inválida.' using errcode = '22023';
  end if;

  select fator into margem from public.configuracoes
   where categoria = 'margem' and opcao = 'padrao';
  margem := coalesce(margem, 0.10);

  horas := round(servico.horas_base * f_porte * f_urg, 1);
  valor := horas * servico.valor_hora;

  new.horas_estimadas := horas;
  new.valor_min       := round(valor * (1 - margem));
  new.valor_max       := round(valor * (1 + margem));
  new.nome_cliente    := btrim(new.nome_cliente);
  new.status          := 'em_analise';
  new.criado_por      := coalesce(auth.uid(), new.criado_por);
  new.criado_em       := now();
  new.valor_final     := null;
  new.horas_finais    := null;
  new.revisado_por    := null;
  new.pdf_gerado_em   := null;
  return new;
end;
$$;

create trigger antes_de_inserir_pedido
  before insert on public.pedidos
  for each row execute function public.calcular_estimativa_pedido();

-- Protege os dados da triagem e registra quem revisou.
create or replace function public.proteger_pedido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.nome_cliente    is distinct from old.nome_cliente
  or new.porte_empresa   is distinct from old.porte_empresa
  or new.tipo_servico_id is distinct from old.tipo_servico_id
  or new.porte_ambiente  is distinct from old.porte_ambiente
  or new.urgencia        is distinct from old.urgencia
  or new.valor_min       is distinct from old.valor_min
  or new.valor_max       is distinct from old.valor_max
  or new.horas_estimadas is distinct from old.horas_estimadas
  or new.criado_por      is distinct from old.criado_por
  or new.criado_em       is distinct from old.criado_em then
    raise exception 'Os dados da triagem não podem ser alterados na revisão.' using errcode = '42501';
  end if;

  if auth.uid() is not null then
    new.revisado_por := auth.uid();
  end if;

  -- A primeira geração do PDF registra a data e muda o status.
  if new.pdf_gerado_em is not null and old.pdf_gerado_em is null then
    new.pdf_gerado_em := now();
    new.status        := 'proposta_enviada';
  elsif new.pdf_gerado_em is distinct from old.pdf_gerado_em then
    new.pdf_gerado_em := old.pdf_gerado_em;
  end if;

  return new;
end;
$$;

create trigger antes_de_atualizar_pedido
  before update on public.pedidos
  for each row execute function public.proteger_pedido();

-- Mantém a data de atualização dos serviços.
create or replace function public.marcar_atualizacao_servico()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger antes_de_atualizar_servico
  before update on public.tipos_servico
  for each row execute function public.marcar_atualizacao_servico();

-- ---------------------------------------------------------------------
-- 3. Segurança por linha (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.usuarios      enable row level security;
alter table public.tipos_servico enable row level security;
alter table public.configuracoes enable row level security;
alter table public.pedidos       enable row level security;

-- usuarios: qualquer membro ativo lê; só o gestor altera.
create policy usuarios_leitura on public.usuarios
  for select to authenticated
  using (public.perfil_atual() is not null);

create policy usuarios_gestor_altera on public.usuarios
  for update to authenticated
  using (public.perfil_atual() = 'gestor')
  with check (public.perfil_atual() = 'gestor');

-- tipos_servico e configuracoes: todos leem; só o gestor altera.
create policy servicos_leitura on public.tipos_servico
  for select to authenticated
  using (public.perfil_atual() is not null);

create policy servicos_gestor_insere on public.tipos_servico
  for insert to authenticated
  with check (public.perfil_atual() = 'gestor');

create policy servicos_gestor_altera on public.tipos_servico
  for update to authenticated
  using (public.perfil_atual() = 'gestor')
  with check (public.perfil_atual() = 'gestor');

create policy configuracoes_leitura on public.configuracoes
  for select to authenticated
  using (public.perfil_atual() is not null);

create policy configuracoes_gestor_altera on public.configuracoes
  for update to authenticated
  using (public.perfil_atual() = 'gestor')
  with check (public.perfil_atual() = 'gestor');

-- pedidos: todos leem; comercial e gestor registram;
-- só especialista e gestor revisam. Ninguém exclui (não há política de delete).
create policy pedidos_leitura on public.pedidos
  for select to authenticated
  using (public.perfil_atual() is not null);

create policy pedidos_registro on public.pedidos
  for insert to authenticated
  with check (public.perfil_atual() in ('comercial', 'gestor'));

create policy pedidos_revisao on public.pedidos
  for update to authenticated
  using (public.perfil_atual() in ('especialista', 'gestor'))
  with check (public.perfil_atual() in ('especialista', 'gestor'));

-- Visitantes sem login não acessam nada.
revoke all on public.usuarios, public.tipos_servico, public.configuracoes, public.pedidos from anon;
