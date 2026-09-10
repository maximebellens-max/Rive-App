-- Retire le tableau "Prospects" (doublon avec Vendeurs/Acheteurs/
-- Investisseurs — un prospect saisi à la main choisit déjà sa catégorie, et
-- un lead Meta la reçoit via le mapping de campagne). Chaque prospect vit
-- désormais uniquement sur le tableau de sa propre catégorie ; voir
-- lib/rive/pipeline-positions.ts, app/actions/pipelines.ts et
-- lib/rive/relance-agent.ts pour le code correspondant.

-- 1. Retire la clé "prospects" de positions pour tous les prospects qui
--    l'ont encore, sans toucher aux autres clés (vendeur/acheteur/
--    investisseur), inchangées.
update leads
  set positions = positions - 'prospects'
  where positions ? 'prospects';

-- 2. Supprime les colonnes du tableau "Prospects", pour toutes les agences.
delete from pipeline_columns where board_type = 'prospects';

-- 3. Supprime le tableau "Prospects" lui-même (table `boards`, la ligne
--    "core" créée à la création de l'agence) — plus rien ne doit y faire
--    référence après l'étape 2 (contrainte pipeline_columns_board_fkey en
--    cascade, migration 12/37, de toute façon déjà vide côté prospects).
delete from boards where id = 'prospects' and kind = 'core';

-- 4. Nouveau modèle pour les futures agences : les 3 tableaux "core"
--    habituels, sans "Prospects".
create or replace function seed_default_boards(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into boards (id, agency_id, name, kind, position)
  values
    ('vendeur', p_agency_id, 'Vendeurs', 'core', 0),
    ('acheteur', p_agency_id, 'Acheteurs', 'core', 1),
    ('investisseur', p_agency_id, 'Investisseurs', 'core', 2)
  on conflict (agency_id, id) do nothing;
end;
$$;

-- 5. Nouveau modèle des colonnes pour les futures agences : les 3 tableaux
--    de catégorie habituels, sans "Prospects".
create or replace function seed_default_pipeline_columns(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pipeline_columns (agency_id, board_type, name, color, position, is_default) values
    (p_agency_id, 'vendeur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'vendeur', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'vendeur', 'RDV 1 planifié', 'sage', 2, true),
    (p_agency_id, 'vendeur', 'RDV 2 planifié (estimation)', 'gold', 3, true),
    (p_agency_id, 'vendeur', 'RDV 2 finalisé', 'brick', 4, true),
    (p_agency_id, 'vendeur', 'Mandat signé', 'success', 5, true),
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