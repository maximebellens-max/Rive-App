-- Stub minimal du schéma Supabase Auth, uniquement pour tester le schéma + les policies RLS
-- localement avec un Postgres nu (sans le stack Docker complet de Supabase, indisponible ici).
create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('myapp.uid', true), '')::uuid
$$;

-- rôle applicatif équivalent au rôle "authenticated" de Supabase : c'est LUI qui est
-- soumis aux policies RLS (le propriétaire des tables, postgres, ne l'est jamais par défaut).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;
