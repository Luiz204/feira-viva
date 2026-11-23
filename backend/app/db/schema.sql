-- =====================================================================
-- Feira Viva — esquema do banco (PostgreSQL / Neon)
-- Aplicado automaticamente pela API ao iniciar (todos os comandos são
-- idempotentes). Também pode ser rodado à mão no SQL Editor do Neon.
-- =====================================================================

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  senha_hash  text not null,
  criado_em   timestamptz not null default now()
);

create table if not exists profiles (
  id          uuid primary key references users(id) on delete cascade,
  role        text not null default 'produtor' check (role in ('produtor', 'admin')),
  nome        text not null default '',
  nome_banca  text not null default '',
  cidade      text not null default '',
  whatsapp    text,                       -- formato 55DDNNNNNNNNN
  descricao   text,
  foto_url    text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  produtor_id  uuid not null references profiles(id) on delete cascade,
  nome         text not null check (char_length(nome) between 1 and 80),
  categoria    text not null check (categoria in (
                 'Frutas', 'Verduras e Legumes', 'Raízes', 'Grãos', 'Ovos e Laticínios',
                 'Carnes', 'Doces e Conservas', 'Artesanato', 'Outros')),
  preco        numeric(10, 2) not null check (preco > 0),
  unidade      text not null check (unidade in ('kg', 'unidade', 'dúzia', 'maço', 'litro', 'pacote')),
  descricao    text,
  foto_url     text,
  disponivel   boolean not null default true,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);
create index if not exists products_produtor_idx on products(produtor_id);
create index if not exists products_categoria_idx on products(categoria);

create table if not exists fairs (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  endereco        text not null,
  bairro          text not null default '',
  cidade          text not null default 'Teresina',
  dias_semana     smallint[] not null default '{}',   -- 0=domingo ... 6=sábado
  horario_inicio  time not null,
  horario_fim     time not null,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

create table if not exists fair_producers (
  feira_id    uuid not null references fairs(id) on delete cascade,
  produtor_id uuid not null references profiles(id) on delete cascade,
  primary key (feira_id, produtor_id)
);

create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  produtor_id       uuid not null references profiles(id) on delete cascade,
  cliente_nome      text not null,
  cliente_telefone  text,
  entrega           text not null check (entrega in ('retirada', 'entrega')),
  observacao        text,
  itens             jsonb not null,
  total             numeric(10, 2) not null,
  status            text not null default 'enviado_whatsapp',
  criado_em         timestamptz not null default now()
);
create index if not exists orders_produtor_idx on orders(produtor_id, criado_em desc);

-- fotos de produtos e perfis (já redimensionadas no navegador, até 2 MB)
create table if not exists images (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references users(id) on delete cascade,
  content_type  text not null,
  dados         bytea not null,
  criado_em     timestamptz not null default now()
);

-- feiras iniciais (só quando a tabela está vazia)
insert into fairs (nome, endereco, bairro, cidade, dias_semana, horario_inicio, horario_fim)
select * from (values
  ('Feira da Agricultura Familiar — Centro', 'Praça Pedro II', 'Centro', 'Teresina', '{6}'::smallint[], '06:00'::time, '12:00'::time),
  ('Feira Orgânica do Jóquei', 'Av. Nossa Senhora de Fátima', 'Jóquei', 'Teresina', '{3,6}'::smallint[], '05:30'::time, '11:00'::time),
  ('Feira Livre do Dirceu', 'Rua Dirceu Arcoverde', 'Dirceu', 'Teresina', '{0}'::smallint[], '05:00'::time, '12:00'::time)
) as v(nome, endereco, bairro, cidade, dias_semana, horario_inicio, horario_fim)
where not exists (select 1 from fairs);
