-- =====================================================================
-- Feira Viva — esquema do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
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

-- cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  produtor_id  uuid not null references public.profiles(id) on delete cascade,
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
create index if not exists products_produtor_idx on public.products(produtor_id);
create index if not exists products_categoria_idx on public.products(categoria);

-- ---------------------------------------------------------------------
-- Feiras livres e vínculo produtor x feira
-- ---------------------------------------------------------------------
create table if not exists public.fairs (
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

create table if not exists public.fair_producers (
  feira_id    uuid not null references public.fairs(id) on delete cascade,
  produtor_id uuid not null references public.profiles(id) on delete cascade,
  primary key (feira_id, produtor_id)
);

-- ---------------------------------------------------------------------
-- Pedidos (registro do pedido enviado ao WhatsApp)
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  produtor_id       uuid not null references public.profiles(id) on delete cascade,
  cliente_nome      text not null,
  cliente_telefone  text,
  entrega           text not null check (entrega in ('retirada', 'entrega')),
  observacao        text,
  itens             jsonb not null,
  total             numeric(10, 2) not null,
  status            text not null default 'enviado_whatsapp',
  criado_em         timestamptz not null default now()
);
create index if not exists orders_produtor_idx on public.orders(produtor_id, criado_em desc);

-- ---------------------------------------------------------------------
-- Row Level Security
-- A API usa a service role (que ignora RLS) e checa permissões no código;
-- as políticas abaixo protegem quem acessar o banco direto com a anon key.
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.fairs          enable row level security;
alter table public.fair_producers enable row level security;
alter table public.orders         enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "perfis públicos ativos" on public.profiles;
create policy "perfis públicos ativos" on public.profiles
  for select using (ativo or id = auth.uid() or public.is_admin());
drop policy if exists "dono edita perfil" on public.profiles;
create policy "dono edita perfil" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists "produtos públicos" on public.products;
create policy "produtos públicos" on public.products
  for select using (ativo or produtor_id = auth.uid() or public.is_admin());
drop policy if exists "dono gerencia produtos" on public.products;
create policy "dono gerencia produtos" on public.products
  for all using (produtor_id = auth.uid() or public.is_admin())
  with check (produtor_id = auth.uid() or public.is_admin());

drop policy if exists "feiras públicas" on public.fairs;
create policy "feiras públicas" on public.fairs for select using (true);
drop policy if exists "admin gerencia feiras" on public.fairs;
create policy "admin gerencia feiras" on public.fairs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vínculos públicos" on public.fair_producers;
create policy "vínculos públicos" on public.fair_producers for select using (true);
drop policy if exists "produtor gerencia vínculos" on public.fair_producers;
create policy "produtor gerencia vínculos" on public.fair_producers
  for all using (produtor_id = auth.uid() or public.is_admin())
  with check (produtor_id = auth.uid() or public.is_admin());

drop policy if exists "produtor vê seus pedidos" on public.orders;
create policy "produtor vê seus pedidos" on public.orders
  for select using (produtor_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Storage: bucket público para fotos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "fotos públicas" on storage.objects;
create policy "fotos públicas" on storage.objects
  for select using (bucket_id = 'fotos');
drop policy if exists "usuário envia fotos na sua pasta" on storage.objects;
create policy "usuário envia fotos na sua pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "usuário apaga suas fotos" on storage.objects;
create policy "usuário apaga suas fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
