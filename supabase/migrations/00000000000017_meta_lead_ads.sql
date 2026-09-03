-- Intégration Meta Lead Ads : un lead qui remplit un formulaire publicitaire
-- Meta (Facebook/Instagram) doit atterrir automatiquement dans Rive, sur le
-- bon tableau, avec le bon propriétaire, et prévenir toute l'agence.
--
-- Le compte publicitaire Meta est connecté une fois par agence (il peut être
-- partagé entre plusieurs agents, comme chez Hevrest). Chaque campagne de ce
-- compte est ensuite mappée individuellement, dans les réglages, vers : qui
-- en est responsable (pour l'alerte) et sur quel tableau ses leads doivent
-- tomber (investisseurs / vendeurs / acheteurs) — cf. meta_campaigns.

-- ---------- connexion Meta (1 par agence) ----------
create table if not exists meta_connections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  connected_by uuid references profiles(id) on delete set null,
  ad_account_id text not null,
  ad_account_name text not null default '',
  page_id text not null default '',
  page_name text not null default '',
  -- Jeton d'accès Page longue durée (renouvelé manuellement si Meta le
  -- révoque) : jamais exposé côté client, lu uniquement par le webhook et
  -- les appels serveur de synchronisation des campagnes.
  access_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id)
);

alter table meta_connections enable row level security;

drop policy if exists "meta_connections: select own agency" on meta_connections;
create policy "meta_connections: select own agency" on meta_connections for select using (agency_id = current_agency_id());
drop policy if exists "meta_connections: insert own agency" on meta_connections;
create policy "meta_connections: insert own agency" on meta_connections for insert with check (agency_id = current_agency_id());
drop policy if exists "meta_connections: update own agency" on meta_connections;
create policy "meta_connections: update own agency" on meta_connections for update using (agency_id = current_agency_id());
drop policy if exists "meta_connections: delete own agency" on meta_connections;
create policy "meta_connections: delete own agency" on meta_connections for delete using (agency_id = current_agency_id());

-- ---------- mapping par campagne ----------
create table if not exists meta_campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  campaign_id text not null,
  campaign_name text not null default '',
  status text not null default '',
  -- Propriétaire de la campagne : sert à préciser l'alerte ("lead de la
  -- campagne de Mandin") — n'importe quel membre de l'agence voit quand même
  -- le lead sur le tableau, ce n'est pas une restriction d'accès.
  owner_id uuid references profiles(id) on delete set null,
  target_category text check (target_category in ('acheteur', 'vendeur', 'investisseur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, campaign_id)
);

create index if not exists meta_campaigns_agency_idx on meta_campaigns (agency_id);

alter table meta_campaigns enable row level security;

drop policy if exists "meta_campaigns: select own agency" on meta_campaigns;
create policy "meta_campaigns: select own agency" on meta_campaigns for select using (agency_id = current_agency_id());
drop policy if exists "meta_campaigns: insert own agency" on meta_campaigns;
create policy "meta_campaigns: insert own agency" on meta_campaigns for insert with check (agency_id = current_agency_id());
drop policy if exists "meta_campaigns: update own agency" on meta_campaigns;
create policy "meta_campaigns: update own agency" on meta_campaigns for update using (agency_id = current_agency_id());
drop policy if exists "meta_campaigns: delete own agency" on meta_campaigns;
create policy "meta_campaigns: delete own agency" on meta_campaigns for delete using (agency_id = current_agency_id());

-- ---------- notifications ----------
-- profile_id = null : notification pour toute l'agence (ex. nouveau lead
-- Meta, tout le monde doit la voir) plutôt que dupliquée par personne.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  type text not null default 'lead_meta',
  title text not null,
  body text not null default '',
  lead_id uuid references leads(id) on delete set null,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists notifications_agency_created_idx on notifications (agency_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "notifications: select own agency" on notifications;
create policy "notifications: select own agency" on notifications for select using (agency_id = current_agency_id());
drop policy if exists "notifications: update own agency" on notifications;
create policy "notifications: update own agency" on notifications for update using (agency_id = current_agency_id());
-- Pas de policy insert/delete : les notifications sont créées uniquement par
-- le webhook (jeton de service, contourne RLS), jamais depuis le client.

-- ---------- traçabilité sur les leads ----------
alter table leads add column if not exists meta_lead_id text;
alter table leads add column if not exists meta_campaign_id text;

-- Empêche un doublon si Meta redélivre le même événement webhook (ça arrive
-- en cas de non-réponse rapide du serveur) : un même meta_lead_id ne peut
-- créer qu'un seul prospect.
create unique index if not exists leads_meta_lead_id_unique on leads (meta_lead_id) where meta_lead_id is not null;

-- ---------- email des membres de l'agence ----------
-- Nécessaire pour envoyer les alertes par email depuis le webhook (qui tourne
-- sans session utilisateur, via le jeton de service) sans avoir à interroger
-- auth.users, non accessible normalement. Synchronisé à l'inscription
-- ci-dessous, et rempli une fois pour les comptes déjà existants.
alter table profiles add column if not exists email text not null default '';

update profiles set email = auth.users.email
from auth.users
where profiles.id = auth.users.id and profiles.email = '';

-- Reprend telle quelle la dernière version de la fonction (migration
-- 00000000000012_custom_boards.sql), en ajoutant uniquement l'email dans les
-- deux insert into profiles — aucun autre changement de logique.
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
    insert into public.profiles (id, agency_id, full_name, role, email)
    values (new.id, v_agency_id, v_full_name, 'agent', new.email);

    update public.agency_invites set accepted_at = now() where id = v_invite_id;

    return new;
  end if;

  v_agency_name := coalesce(new.raw_user_meta_data->>'agency_name', 'Mon agence');

  insert into public.agencies (name) values (v_agency_name) returning id into v_agency_id;

  insert into public.profiles (id, agency_id, full_name, role, email)
  values (new.id, v_agency_id, v_full_name, 'owner', new.email);

  perform public.seed_default_boards(v_agency_id);
  perform public.seed_default_pipeline_columns(v_agency_id);
  perform public.seed_default_templates(v_agency_id);

  return new;
end;
$$;