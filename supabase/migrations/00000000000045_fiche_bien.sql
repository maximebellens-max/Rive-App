-- Fiche bien complète (mandats de vente) : lots/copropriété, origine de
-- propriété, diagnostics obligatoires, photos et documents. Vient s'ajouter
-- à la fiche existante (estimation, comparaison DVF...) sans rien y retirer
-- — ce lot prépare aussi le terrain pour une future diffusion vers les
-- portails via API (hors périmètre pour l'instant, juste la donnée de base).

alter table mandates add column if not exists en_copropriete boolean not null default false;
-- Informations de la copropriété elle-même (pas d'un lot en particulier) :
-- { total_lots, charges_annuelles, syndic_nom, syndic_contact,
--   procedures_en_cours, fonds_travaux } — voir lib/rive/mandates.ts.
alter table mandates add column if not exists copropriete jsonb not null default '{}'::jsonb;
-- { date_acquisition, mode_acquisition, notaire, reference_acte, prix_acquisition }
alter table mandates add column if not exists origine_propriete jsonb not null default '{}'::jsonb;
-- Une entrée par diagnostic (clé = DIAGNOSTIC_TYPES dans lib/rive/mandates.ts) :
-- { date_realisation, date_validite, resultat }. Le DPE garde en plus sa
-- note simple existante (colonne `dpe`, A à G, utilisée par le moteur
-- d'estimation) — ce nouveau champ ne la remplace pas.
alter table mandates add column if not exists diagnostics jsonb not null default '{}'::jsonb;

-- Un mandat peut porter plusieurs lots de copropriété (l'appartement +
-- une cave, un parking...), chacun avec son propre numéro et ses propres
-- tantièmes — distinct des informations de la copropriété elle-même
-- (syndic, charges, fonds travaux...) stockées ci-dessus dans `copropriete`.
create table if not exists mandate_lots (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  lot_number text not null default '',
  designation text not null default '',
  tantiemes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists mandate_lots_mandate_id_idx on mandate_lots (mandate_id);

alter table mandate_lots enable row level security;

drop policy if exists "mandate_lots: select own agency" on mandate_lots;
create policy "mandate_lots: select own agency" on mandate_lots for select using (agency_id = current_agency_id());
drop policy if exists "mandate_lots: insert own agency" on mandate_lots;
create policy "mandate_lots: insert own agency" on mandate_lots for insert with check (agency_id = current_agency_id());
drop policy if exists "mandate_lots: update own agency" on mandate_lots;
create policy "mandate_lots: update own agency" on mandate_lots for update using (agency_id = current_agency_id());
drop policy if exists "mandate_lots: delete own agency" on mandate_lots;
create policy "mandate_lots: delete own agency" on mandate_lots for delete using (agency_id = current_agency_id());

-- Photos et documents (diagnostics scannés, titre de propriété...) attachés
-- à un mandat. Le fichier réel vit dans le bucket de stockage privé
-- "mandate-files" (voir policies plus bas) sous
-- {agency_id}/{mandate_id}/{uuid}{extension} — cette table n'en garde que
-- les métadonnées ; l'accès au fichier passe toujours par une URL signée
-- générée côté serveur (voir app/actions/mandate-property.ts).
create table if not exists mandate_files (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  category text not null check (category in ('photo', 'document')),
  -- Justificatif d'un diagnostic précis (clé DIAGNOSTIC_TYPES) : null si le
  -- document n'est rattaché à aucun diagnostic en particulier (titre de
  -- propriété, autre pièce...).
  diagnostic_type text,
  label text not null default '',
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  position integer not null default 0,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists mandate_files_mandate_id_idx on mandate_files (mandate_id);

alter table mandate_files enable row level security;

drop policy if exists "mandate_files: select own agency" on mandate_files;
create policy "mandate_files: select own agency" on mandate_files for select using (agency_id = current_agency_id());
drop policy if exists "mandate_files: insert own agency" on mandate_files;
create policy "mandate_files: insert own agency" on mandate_files for insert with check (agency_id = current_agency_id());
drop policy if exists "mandate_files: update own agency" on mandate_files;
create policy "mandate_files: update own agency" on mandate_files for update using (agency_id = current_agency_id());
drop policy if exists "mandate_files: delete own agency" on mandate_files;
create policy "mandate_files: delete own agency" on mandate_files for delete using (agency_id = current_agency_id());

-- Bucket de stockage privé pour les fichiers ci-dessus — jamais public :
-- l'accès passe toujours par une URL signée à durée limitée.
insert into storage.buckets (id, name, public)
values ('mandate-files', 'mandate-files', false)
on conflict (id) do nothing;

-- Le chemin de chaque fichier commence toujours par l'id de l'agence
-- ({agency_id}/{mandate_id}/{uuid}...) : ces policies vérifient ce premier
-- segment plutôt que de faire un aller-retour vers mandate_files, pour
-- rester rapides et ne jamais dépendre d'une ligne de métadonnées qui
-- pourrait avoir été supprimée entre-temps. current_agency_id() est
-- qualifiée (public.) car ces policies s'exécutent dans le schéma storage.
drop policy if exists "mandate-files bucket: select own agency" on storage.objects;
create policy "mandate-files bucket: select own agency"
  on storage.objects for select
  using (bucket_id = 'mandate-files' and (storage.foldername(name))[1] = public.current_agency_id()::text);

drop policy if exists "mandate-files bucket: insert own agency" on storage.objects;
create policy "mandate-files bucket: insert own agency"
  on storage.objects for insert
  with check (bucket_id = 'mandate-files' and (storage.foldername(name))[1] = public.current_agency_id()::text);

drop policy if exists "mandate-files bucket: delete own agency" on storage.objects;
create policy "mandate-files bucket: delete own agency"
  on storage.objects for delete
  using (bucket_id = 'mandate-files' and (storage.foldername(name))[1] = public.current_agency_id()::text);