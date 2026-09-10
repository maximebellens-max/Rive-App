-- Corrige une race condition qui pouvait faire "disparaître" un prospect
-- d'un tableau (sa position perdue dans leads.positions), signalée sur
-- plusieurs fiches (ex. Catherine MIGEON QUEZEL) : plusieurs actions
-- (déplacement de carte, enregistrement de la fiche, activation d'un
-- mandat) lisaient leads.positions en JS, le modifiaient, puis réécrivaient
-- l'objet entier — si deux de ces actions se chevauchaient (typiquement :
-- glisser une carte vers une colonne "RDV", qui envoie aussitôt l'agent sur
-- la fiche du prospect, puis enregistrer cette fiche avant que le
-- déplacement ait fini côté serveur), la plus lente écrasait
-- silencieusement le travail de l'autre — parfois en effaçant complètement
-- la position du prospect si elle n'existait pas encore avant le
-- déplacement en cours. Ces fonctions font la fusion directement dans la
-- requête SQL (un seul UPDATE atomique par appel), sans jamais faire de
-- lecture puis réécriture de l'objet entier côté application.
create or replace function set_lead_board_position(p_lead_id uuid, p_board_type text, p_column_id uuid)
returns void
language sql
as $$
  update leads
  set positions = coalesce(positions, '{}'::jsonb) || jsonb_build_object(p_board_type, p_column_id::text)
  where id = p_lead_id;
$$;

-- Même principe pour un changement de catégorie de prospect : retire la
-- position sur l'ancien tableau et ajoute la 1ère colonne du nouveau (sauf
-- s'il y a déjà une position dessus), en un seul UPDATE atomique.
create or replace function reconcile_lead_category_position(
  p_lead_id uuid,
  p_old_board_type text,
  p_new_board_type text,
  p_new_column_id uuid
)
returns void
language plpgsql
as $$
begin
  update leads
  set positions =
    (case when p_old_board_type is not null then coalesce(positions, '{}'::jsonb) - p_old_board_type else coalesce(positions, '{}'::jsonb) end)
    || (case
          when p_new_board_type is not null
               and p_new_column_id is not null
               and not (coalesce(positions, '{}'::jsonb) ? p_new_board_type)
          then jsonb_build_object(p_new_board_type, p_new_column_id::text)
          else '{}'::jsonb
        end)
  where id = p_lead_id;
end;
$$;