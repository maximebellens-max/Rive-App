-- Intégration landing pages externes (Netlify ou autre) : un prospect qui
-- remplit un formulaire sur une landing page doit atterrir automatiquement
-- dans Rive, sur le tableau choisi pour cette page précise — même principe
-- que Meta Lead Ads (arrivée automatique, bon tableau, toute l'agence
-- prévenue), mais sans OAuth possible ici (Netlify n'expose aucune API de
-- récupération de leads comme Meta) : chaque landing page reçoit à la place
-- un jeton opaque unique dans son URL de webhook (même principe que le flux
-- ICS, agencies.ics_token), que le formulaire de la page poste directement
-- via un petit appel fetch() ajouté à son code — voir
-- app/api/webhooks/landing/[token]/route.ts.

create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  -- Nom donné par l'agent (ex. "Investisseurs Géorgie") — sert aussi de
  -- libellé de source sur les prospects reçus (leads.source), pour que le
  -- tableau Performance distingue chaque landing page.
  label text not null,
  -- URL de la landing page, uniquement informative (affichée dans les
  -- réglages) — ne sert à rien côté webhook, qui n'est identifié que par le
  -- jeton.
  url text not null default '',
  category text not null check (category in ('acheteur', 'vendeur', 'investisseur_france', 'investisseur_dubai', 'investisseur_georgie')),
  -- Propriétaire par défaut des leads de cette page (facultatif) — comme
  -- meta_campaigns.owner_id, sert à préciser l'alerte, ne restreint pas la
  -- visibilité du prospect dans l'agence.
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists landing_pages_agency_idx on landing_pages (agency_id);

alter table landing_pages enable row level security;

drop policy if exists "landing_pages: select own agency" on landing_pages;
create policy "landing_pages: select own agency" on landing_pages for select using (agency_id = current_agency_id());
drop policy if exists "landing_pages: insert own agency" on landing_pages;
create policy "landing_pages: insert own agency" on landing_pages for insert with check (agency_id = current_agency_id());
drop policy if exists "landing_pages: update own agency" on landing_pages;
create policy "landing_pages: update own agency" on landing_pages for update using (agency_id = current_agency_id());
drop policy if exists "landing_pages: delete own agency" on landing_pages;
create policy "landing_pages: delete own agency" on landing_pages for delete using (agency_id = current_agency_id());

-- ---------- traçabilité + déduplication sur les leads ----------
alter table leads add column if not exists landing_page_id uuid references landing_pages(id) on delete set null;
-- Identifiant de soumission facultatif, généré côté navigateur par la
-- landing page (ex. crypto.randomUUID() au chargement du formulaire) —
-- absorbe un double clic sur "Envoyer" sans créer 2 fiches identiques.
-- Aucune déduplication n'a lieu si la page ne l'envoie pas (comportement par
-- défaut d'un simple formulaire de contact).
alter table leads add column if not exists landing_submission_id text;

create unique index if not exists leads_landing_submission_unique
  on leads (landing_page_id, landing_submission_id)
  where landing_submission_id is not null;