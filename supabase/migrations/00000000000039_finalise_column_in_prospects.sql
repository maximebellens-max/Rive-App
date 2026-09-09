-- Ajoute un tableau "Finalisé" au pipeline Prospects, juste avant "Sans
-- suite" (même mécanique que "Client actif" en migration 037) : les dossiers
-- menés à leur terme (accompagnement achevé) ont leur propre étape plutôt
-- que d'être mélangés avec "Sans suite", qui reste réservé aux dossiers qui
-- n'ont pas abouti.

do $$
declare
  a record;
begin
  for a in select id from agencies loop
    -- Idempotent : si l'agence a déjà sa colonne "Finalisé" sur Prospects
    -- (relance de cette migration), on ne fait rien.
    if not exists (
      select 1 from pipeline_columns
      where agency_id = a.id and board_type = 'prospects' and name = 'Finalisé'
    ) then
      -- Décale à partir de la position 4 (typiquement "Sans suite", et toute
      -- étape personnalisée que l'agence aurait ajoutée après) pour laisser
      -- la place à "Finalisé".
      update pipeline_columns
        set position = position + 1
        where agency_id = a.id and board_type = 'prospects' and position >= 4;

      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default)
        values (a.id, 'prospects', 'Finalisé', 'plum', 4, true);
    end if;
  end loop;
end $$;

-- Seed utilisé à la création d'une nouvelle agence.
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
    (p_agency_id, 'prospects', 'Finalisé', 'plum', 4, true),
    (p_agency_id, 'prospects', 'Sans suite', 'sand', 5, true),
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