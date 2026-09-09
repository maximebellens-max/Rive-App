-- Retour en arrière sur le tableau "Client" séparé (migrations 36/fix) : au
-- lieu d'un onglet à part (redondant avec Mandats / Projets investisseur),
-- "Client actif" devient une étape de plus DANS le tableau Prospects lui-même
-- (juste après "Qualifié", avant "Sans suite"). Un prospect y bascule
-- automatiquement dès qu'un mandat (vente ou recherche) est signé/activé, ou
-- peut y être glissé à la main.

do $$
declare
  a record;
  v_client_col uuid;
begin
  for a in select id from agencies loop
    -- Idempotent : si l'agence a déjà sa colonne "Client actif" sur
    -- Prospects (relance de cette migration), on saute le décalage des
    -- positions et l'insertion, on récupère juste son id.
    if not exists (
      select 1 from pipeline_columns
      where agency_id = a.id and board_type = 'prospects' and name = 'Client actif'
    ) then
      -- Décale les colonnes Prospects existantes à partir de la position 3
      -- (typiquement "Sans suite", et toute étape personnalisée que l'agence
      -- aurait ajoutée après) pour laisser la place à "Client actif".
      update pipeline_columns
        set position = position + 1
        where agency_id = a.id and board_type = 'prospects' and position >= 3;

      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default)
        values (a.id, 'prospects', 'Client actif', 'success', 3, true)
        returning id into v_client_col;
    else
      select id into v_client_col
      from pipeline_columns
      where agency_id = a.id and board_type = 'prospects' and name = 'Client actif'
      limit 1;
    end if;

    -- Les prospects déjà basculés sur l'ancien tableau "Client" séparé
    -- (fonctionnalité déployée puis retirée dans la foulée) atterrissent sur
    -- cette nouvelle colonne, en nettoyant l'ancienne clé "client".
    update leads
      set positions = (positions - 'client') || jsonb_build_object('prospects', v_client_col::text)
      where agency_id = a.id and positions ? 'client';

    -- Supprime les vestiges de l'ancien tableau séparé : la ligne `boards`
    -- entraîne en cascade la suppression de sa colonne `pipeline_columns`
    -- (contrainte pipeline_columns_board_fkey, migration 12).
    delete from boards where agency_id = a.id and id = 'client';
  end loop;
end $$;

-- Seed utilisé à la création d'une nouvelle agence : retour à 4 tableaux
-- "core" (plus de 5ème tableau "Client").
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
    ('investisseur', p_agency_id, 'Investisseurs', 'core', 3)
  on conflict (agency_id, id) do nothing;
end;
$$;

-- Seed des colonnes : "Client actif" rejoint Prospects en position 3 (juste
-- après "Qualifié"), "Sans suite" passe en position 4. Plus de colonnes pour
-- un board_type 'client'.
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
    (p_agency_id, 'prospects', 'Client actif', 'success', 3, true),
    (p_agency_id, 'prospects', 'Sans suite', 'sand', 4, true),
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
    (p_agency_id, 'investisseur', 'Mandat de recherche', 'success', 4, true);
end;
$$;