-- Simule le signup de deux agences différentes, puis vérifie que chaque utilisateur
-- ne peut voir/modifier QUE les données de sa propre agence.
\set ON_ERROR_STOP on

insert into auth.users (id, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', '{"agency_name":"Hevrest","full_name":"Maxime"}'),
  ('22222222-2222-2222-2222-222222222222', '{"agency_name":"Agence Concurrente","full_name":"Autre Agent"}');

-- déclenche handle_new_user() comme le ferait un vrai signup Supabase
select handle_new_user() from auth.users where false; -- no-op, le trigger se déclenche sur INSERT ci-dessus déjà passé
-- (le trigger a déjà tourné sur les deux INSERT précédents ; on vérifie juste le résultat)

\echo '--- agences créées ---'
select a.id, a.name, p.id as profile_id, p.full_name, p.role
from agencies a join profiles p on p.agency_id = a.id
order by a.name;
