-- =====================================================================
-- OrçaSec – Dados iniciais (valores fictícios de exemplo)
-- Execute depois do schema.sql. O gestor pode ajustar tudo depois
-- na tela "Configurações".
-- =====================================================================

insert into public.tipos_servico (codigo, nome, descricao, valor_hora, horas_base) values
  ('web',    'Aplicação web',     'Teste de segurança em sites e sistemas web.', 200, 40),
  ('rede',   'Rede interna',      'Teste de segurança na rede interna da empresa.', 180, 32),
  ('mobile', 'Aplicativo móvel',  'Teste de segurança em aplicativos Android e iOS.', 220, 36);

insert into public.configuracoes (categoria, opcao, rotulo, fator, ordem) values
  ('porte',    'pequeno', 'Pequeno', 1.00, 1),
  ('porte',    'medio',   'Médio',   1.50, 2),
  ('porte',    'grande',  'Grande',  2.00, 3),
  ('urgencia', 'normal',  'Normal',  1.00, 1),
  ('urgencia', 'alta',    'Alta',    1.20, 2),
  ('margem',   'padrao',  'Margem da faixa', 0.10, 1);

-- ---------------------------------------------------------------------
-- OPCIONAL: pedidos fictícios para demonstração.
-- Só funciona depois que existir pelo menos um usuário cadastrado.
-- Tire os comentários (--) das linhas abaixo para usar.
-- ---------------------------------------------------------------------
-- insert into public.pedidos (nome_cliente, porte_empresa, tipo_servico_id, porte_ambiente, urgencia, valor_min, valor_max, horas_estimadas, criado_por)
-- select v.cliente, v.porte, t.id, v.ambiente, v.urgencia, 0, 0, 1, (select id from public.usuarios order by criado_em limit 1)
-- from (values
--   ('Padaria Pão Dourado Ltda', 'pequena', 'web',    'medio',   'alta'),
--   ('Clínica Bem Viver',        'media',   'rede',   'medio',   'normal'),
--   ('Loja Verde Moda',          'pequena', 'mobile', 'medio',   'normal'),
--   ('Escola Saber Mais',        'media',   'web',    'pequeno', 'normal')
-- ) as v(cliente, porte, codigo, ambiente, urgencia)
-- join public.tipos_servico t on t.codigo = v.codigo;
