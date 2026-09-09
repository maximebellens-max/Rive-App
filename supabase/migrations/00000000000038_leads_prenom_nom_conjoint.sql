-- Sépare le nom du prospect en prénom / nom, et ajoute le nom du conjoint
-- (marié(e) ou pacsé(e)) pour les dossiers en couple. Le champ "name"
-- existant reste en place mais devient calculé automatiquement à partir de
-- ces nouveaux champs (et inclut le conjoint quand marital_status l'indique)
-- : tout le reste de l'app (tableaux de suivi, Mandats, Kanban, recherche,
-- combobox…) continue de fonctionner sans aucun changement, puisqu'il lit
-- toujours "name".

alter table leads add column if not exists first_name text not null default '';
alter table leads add column if not exists last_name text not null default '';
alter table leads add column if not exists spouse_first_name text not null default '';
alter table leads add column if not exists spouse_last_name text not null default '';

-- Reprise des fiches existantes : le 1er mot de l'ancien "name" devient le
-- prénom, le reste devient le nom (modifiable ensuite à la main sur la fiche
-- si le résultat n'est pas le bon découpage).
update leads set
  first_name = case when position(' ' in name) > 0 then split_part(name, ' ', 1) else name end,
  last_name = case when position(' ' in name) > 0 then trim(substring(name from position(' ' in name) + 1)) else '' end
where first_name = '' and last_name = '';

-- "name" devient une colonne calculée : impossible d'y écrire directement
-- désormais (le code applicatif écrit first_name / last_name à la place).
alter table leads drop column name;

alter table leads add column name text generated always as (
  trim(both ' ' from (
    trim(both ' ' from (first_name || ' ' || last_name))
    || case
         when marital_status in ('Marié(e)', 'Pacsé(e)')
              and trim(both ' ' from (spouse_first_name || ' ' || spouse_last_name)) <> ''
         then ' & ' || trim(both ' ' from (spouse_first_name || ' ' || spouse_last_name))
         else ''
       end
  ))
) stored not null;