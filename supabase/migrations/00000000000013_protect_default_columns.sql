-- Empêche la suppression accidentelle d'une étape par défaut d'un pipeline
-- (Prospects / Vendeur / Acheteur / Investisseur) : Maxime en a supprimé une
-- par erreur dans Prospects, ce qui a mélangé les positions de ses
-- prospects. Seules les étapes ajoutées ensuite par l'agence (via "+
-- Ajouter une étape") restent supprimables ; les tableaux personnalisés ne
-- sont pas concernés, leurs colonnes restent librement modifiables.

alter table pipeline_columns add column if not exists is_default boolean not null default false;

-- Toutes les colonnes existant aujourd'hui sur les 4 tableaux fixes sont
-- protégées, qu'elles aient été semées automatiquement ou ajoutées avant
-- cette migration — pour ne plus jamais perdre une étape en place.
update pipeline_columns
set is_default = true
where board_type in ('prospects', 'vendeur', 'acheteur', 'investisseur');

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
    (p_agency_id, 'investisseur', 'Mandat de recherche', 'success', 4, true);
end;
$$;
