-- Script ponctuel (à coller dans le SQL Editor de Supabase, après la
-- migration 13) pour restaurer la/les étape(s) par défaut du tableau
-- Prospects qui auraient été supprimées par erreur.
--
-- Ta base contient plusieurs agences (probablement un test), donc ce
-- script se fait en 2 étapes : d'abord identifier la bonne agence, puis
-- restaurer ses étapes manquantes.
--
-- ⚠️ Limite : les prospects qui se trouvaient dans l'étape supprimée ont été
-- automatiquement déplacés vers la 1ère colonne restante au moment de la
-- suppression — cette information n'a pas été conservée, donc ce script
-- recrée l'étape vide. Si tu te souviens de quels prospects s'y
-- trouvaient, il faudra les redéplacer manuellement en glissant leur
-- carte sur le tableau Prospects.


-- ─────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : exécute uniquement cette requête d'abord, pour repérer l'id de
-- ta vraie agence (celle avec le plus de membres/prospects, ou le bon nom).
-- ─────────────────────────────────────────────────────────────────────────

select
  a.id,
  a.name,
  a.created_at,
  (select count(*) from profiles p where p.agency_id = a.id) as membres,
  (select count(*) from leads l where l.agency_id = a.id) as prospects
from agencies a
order by a.created_at;


-- ─────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : remplace '<TON_AGENCY_ID>' ci-dessous par l'id trouvé à
-- l'étape 1 (colonne "id"), puis exécute uniquement ce second bloc.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  v_agency_id uuid := '<TON_AGENCY_ID>'::uuid;
  d record;
begin
  if not exists (select 1 from agencies where id = v_agency_id) then
    raise exception 'Aucune agence trouvée avec cet id — vérifie que tu as bien remplacé <TON_AGENCY_ID> par l''id copié à l''étape 1.';
  end if;

  for d in
    select * from (values
      ('Nouveau lead', 'slate', 0),
      ('Contacté', 'teal', 1),
      ('Qualifié', 'gold', 2),
      ('Sans suite', 'sand', 3)
    ) as t(name, color, position)
  loop
    if not exists (
      select 1 from pipeline_columns
      where agency_id = v_agency_id and board_type = 'prospects' and name = d.name
    ) then
      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default)
      values (v_agency_id, 'prospects', d.name, d.color, d.position, true);
      raise notice 'Étape restaurée : %', d.name;
    end if;
  end loop;
end $$;
