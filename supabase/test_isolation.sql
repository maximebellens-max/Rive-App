\set ON_ERROR_STOP on

-- passe sous le rôle applicatif "authenticated" (celui soumis aux policies RLS)
set role authenticated;

-- ---------- en tant que Maxime (Hevrest) ----------
set myapp.uid = '11111111-1111-1111-1111-111111111111';

insert into leads (agency_id, name, category)
values ((select agency_id from profiles where id = auth.uid()), 'Prospect Hevrest', 'vendeur');

\echo '--- Maxime voit (devrait montrer 1 ligne, Hevrest uniquement) ---'
select name, category from leads;

reset role;
set role authenticated;

-- ---------- en tant que l'agent de l'agence concurrente ----------
set myapp.uid = '22222222-2222-2222-2222-222222222222';

insert into leads (agency_id, name, category)
values ((select agency_id from profiles where id = auth.uid()), 'Prospect Concurrent', 'acheteur');

\echo '--- Agence concurrente voit (devrait montrer 1 ligne, la sienne uniquement) ---'
select name, category from leads;

\echo '--- Tentative malveillante : injecter une ligne dans l''agence de Maxime en tant qu''agent concurrent (DOIT ECHOUER) ---'
\set ON_ERROR_STOP off
insert into leads (agency_id, name, category)
values ((select agency_id from profiles where id = '11111111-1111-1111-1111-111111111111'), 'Injection malveillante', 'vendeur');
\set ON_ERROR_STOP on

reset role;
\echo '--- Vue admin (postgres, bypass RLS) : combien de lignes existent réellement au total ? ---'
select count(*) as total_leads_in_db from leads;
select name, agency_id from leads order by name;
