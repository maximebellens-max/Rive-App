-- Nouveau tableau fixe "Client" : une fois qu'un mandat (vente ou recherche)
-- est signé/activé pour un prospect, il bascule automatiquement sur ce
-- tableau (une seule colonne "Client actif" pour l'instant) plutôt que de
-- s'accumuler indéfiniment sur "Qualifié" côté Prospects, mélangé aux
-- prospects encore en cours de qualification.
--
-- pipeline_columns.board_type est contraint par une clé étrangère vers
-- boards (agency_id, id) (voir migration 12) — pas par un simple CHECK.
-- Il faut donc d'abord donner à chaque agence une ligne `boards` "core"
-- pour 'client', avant de pouvoir créer sa colonne "Client actif" dans
-- pipeline_columns, sous peine de violer cette clé étrangère.

-- Étend le seed des tableaux "core" utilisé à la création d'une nouvelle
-- agence : ajoute "Clients" en 5e position, aux côtés de
-- Prospects/Vendeurs/Acheteurs/Investisseurs.
create or replace function seed_default_boards(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into boards (id, agency_id, name, kind, position)
  values
    ('prospects', p_agency_id, 'Prospects', 'core', 0),
    ('vendeur', p_agency_id, 'Vendeurs', 'core', 1),
    ('acheteur', p_agency_id, 'Acheteurs', 'core', 2),
    ('investisseur', p_agency_id, 'Investisseurs', 'core', 3),
    ('client', p_agency_id, 'Clients', 'core', 4)
  on conflict (agency_id, id) do nothing;
end;
$$;

-- Étend le seed des colonnes utilisé à la création d'une nouvelle agence.
create or replace function seed_default_pipeline_columns(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pipeline_columns (agency_id, board_type, name, color, position, is_default) values
    (p_agency_id, 'prospects', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'prospects', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'prospects', 'Qualifié', 'gold', 2, true),
    (p_agency_id, 'prospects', 'Sans suite', 'sand', 3, true),
    (p_agency_id, 'vendeur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'vendeur', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'vendeur', 'RDV 1 planifié', 'sage', 2, true),
    (p_agency_id, 'vendeur', 'RDV 2 planifié (estimation)', 'gold', 3, true),
    (p_agency_id, 'vendeur', 'Mandat signé', 'success', 4, true),
    (p_agency_id, 'acheteur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'acheteur', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'acheteur', 'RDV de visite', 'sage', 2, true),
    (p_agency_id, 'investisseur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'investisseur', 'Qualifié', 'teal', 1, true),
    (p_agency_id, 'investisseur', 'RDV 1', 'sage', 2, true),
    (p_agency_id, 'investisseur', 'Validation de financement', 'gold', 3, true),
    (p_agency_id, 'investisseur', 'Mandat de recherche', 'success', 4, true),
    (p_agency_id, 'client', 'Client actif', 'success', 0, true);
end;
$$;

-- Backfill pour les agences déjà créées, dans l'ordre exigé par la clé
-- étrangère : d'abord la ligne `boards` "Clients", puis la colonne
-- pipeline_columns "Client actif" correspondante.
do $$
declare
  a record;
begin
  for a in select id from agencies loop
    insert into boards (id, agency_id, name, kind, position)
      values ('client', a.id, 'Clients', 'core', 4)
      on conflict (agency_id, id) do nothing;

    if not exists (select 1 from pipeline_columns where agency_id = a.id and board_type = 'client') then
      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default)
        values (a.id, 'client', 'Client actif', 'success', 0, true);
    end if;
  end loop;
end $$;