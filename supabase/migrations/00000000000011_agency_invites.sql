-- Invitation d'un second agent dans l'agence (ex : Mandin).
-- Un propriétaire (role = 'owner') invite par email ; l'invité crée son
-- compte via /signup?invite=TOKEN et rejoint l'agence existante au lieu
-- d'en créer une nouvelle.

create table if not exists public.agency_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid(),
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists agency_invites_token_key on public.agency_invites (token);
create index if not exists agency_invites_agency_id_idx on public.agency_invites (agency_id);

alter table public.agency_invites enable row level security;

drop policy if exists "agency_invites: select own agency" on public.agency_invites;
create policy "agency_invites: select own agency"
  on public.agency_invites for select
  using (agency_id = public.current_agency_id());

drop policy if exists "agency_invites: insert own agency" on public.agency_invites;
create policy "agency_invites: insert own agency"
  on public.agency_invites for insert
  with check (agency_id = public.current_agency_id());

drop policy if exists "agency_invites: delete own agency" on public.agency_invites;
create policy "agency_invites: delete own agency"
  on public.agency_invites for delete
  using (agency_id = public.current_agency_id());

-- Permet à un visiteur non authentifié (sur /signup?invite=TOKEN) de voir
-- l'email invité et le nom de l'agence, sans exposer le reste de la table.
create or replace function public.get_invite_info(p_token uuid)
returns table (email text, agency_name text, valid boolean)
language sql
security definer
set search_path = public
as $$
  select
    ai.email,
    a.name as agency_name,
    (ai.accepted_at is null) as valid
  from public.agency_invites ai
  join public.agencies a on a.id = ai.agency_id
  where ai.token = p_token
  limit 1;
$$;

grant execute on function public.get_invite_info(uuid) to anon, authenticated;

-- Met à jour le trigger de création de compte : si des métadonnées
-- d'invitation valides sont présentes, rattache le nouvel utilisateur à
-- l'agence existante (rôle "agent") au lieu de créer une nouvelle agence.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_invite_token uuid;
  v_invite_id uuid;
  v_full_name text;
  v_agency_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');
  v_invite_token := nullif(new.raw_user_meta_data->>'invite_token', '')::uuid;

  if v_invite_token is not null then
    select id, agency_id into v_invite_id, v_agency_id
    from public.agency_invites
    where token = v_invite_token
      and accepted_at is null
      and lower(email) = lower(new.email)
    limit 1;
  end if;

  if v_agency_id is not null then
    insert into public.profiles (id, agency_id, full_name, role)
    values (new.id, v_agency_id, v_full_name, 'agent');

    update public.agency_invites set accepted_at = now() where id = v_invite_id;

    return new;
  end if;

  v_agency_name := coalesce(new.raw_user_meta_data->>'agency_name', 'Mon agence');

  insert into public.agencies (name) values (v_agency_name) returning id into v_agency_id;

  insert into public.profiles (id, agency_id, full_name, role)
  values (new.id, v_agency_id, v_full_name, 'owner');

  perform public.seed_default_pipeline_columns(v_agency_id);
  perform public.seed_default_templates(v_agency_id);

  return new;
end;
$$;
