-- Nouveau tableau fixe "Client" : une fois qu'un mandat (vente ou recherche)
-- est signé/activé pour un prospect, il bascule automatiquement sur ce
-- tableau (une seule colonne "Client actif" pour l'instant) plutôt que de
-- s'accumuler indéfiniment sur "Qualifié" côté Prospects, mélangé aux
-- prospects encore en cours de qualification.

alter table pipeline_columns drop constraint if exists pipeline_columns_board_type_check;
alter table pipeline_columns add constraint pipeline_columns_board_type_check
  check (board_type in ('prospects', 'vendeur', 'acheteur', 'investisseur', 'client'));

-- Étend le seed utilisé à la création d'une nouvelle agence.
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

-- Backfill : les agences déjà créées n'ont pas encore de colonne "Client".
do $$
declare
  a record;
begin
  for a in select id from agencies loop
    if not exists (select 1 from pipeline_columns where agency_id = a.id and board_type = 'client') then
      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default)
        values (a.id, 'client', 'Client actif', 'success', 0, true);
    end if;
  end loop;
end $$;