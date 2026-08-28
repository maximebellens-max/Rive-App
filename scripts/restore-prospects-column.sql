-- Script ponctuel (à coller UNE FOIS dans le SQL Editor de Supabase, après
-- la migration 13) pour restaurer la/les étape(s) par défaut du tableau
-- Prospects qui auraient été supprimées par erreur.
--
-- Il compare les 4 étapes par défaut attendues à celles qui existent
-- réellement pour l'agence, et ne réinsère que celle(s) qui manque(nt) — sans
-- toucher aux étapes déjà en place ni à leurs prospects.
--
-- ⚠️ Limite : les prospects qui se trouvaient dans l'étape supprimée ont été
-- automatiquement déplacés vers la 1ère colonne restante au moment de la
-- suppression (comportement normal de "supprimer une étape") — cette
-- information n'a pas été conservée, donc ce script recrée l'étape vide.
-- Si tu te souviens de quels prospects s'y trouvaient, il faudra les
-- redéplacer manuellement en glissant leur carte sur le tableau Prospects.
--
-- Si cette base contient plusieurs agences, remplace la ligne
-- "select id into v_agency_id from agencies limit 1;" par
-- "select id into v_agency_id from agencies where name = 'Hevrest';"
-- (ou le nom exact de ton agence).

do $$
declare
  v_agency_id uuid;
  v_agency_count integer;
  d record;
begin
  select count(*) into v_agency_count from agencies;
  if v_agency_count <> 1 then
    raise exception 'Cette base contient % agence(s) — remplace "select id into v_agency_id from agencies limit 1;" par un filtre sur le nom exact de ton agence avant de relancer ce script.', v_agency_count;
  end if;

  select id into v_agency_id from agencies limit 1;

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
