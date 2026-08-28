\set ON_ERROR_STOP on

set role authenticated;
set myapp.uid = '11111111-1111-1111-1111-111111111111';

insert into mandates (agency_id, type, address)
values ((select agency_id from profiles where id = auth.uid()), 'vente', 'Test mandat Hevrest')
returning id \gset hevrest_

\echo '--- numéro attribué (devrait être 1, next_mandate_number par défaut) ---'
select assign_mandate_number(:'hevrest_id');

\echo '--- ré-appeler doit renvoyer le même numéro (idempotent) ---'
select assign_mandate_number(:'hevrest_id');

\echo '--- mandate_parties : Maxime ajoute un mandant ---'
insert into mandate_parties (agency_id, mandate_id, first_name, last_name)
values ((select agency_id from profiles where id = auth.uid()), :'hevrest_id', 'Jean', 'Dupont');

select first_name, last_name from mandate_parties;

reset role;
set role authenticated;
set myapp.uid = '22222222-2222-2222-2222-222222222222';

\echo '--- Agence concurrente tente d''attribuer un numéro sur le mandat de Hevrest (DOIT ECHOUER) ---'
\set ON_ERROR_STOP off
select assign_mandate_number(:'hevrest_id');
\set ON_ERROR_STOP on

\echo '--- Agence concurrente ne doit voir aucun mandate_parties (isolation) ---'
select count(*) from mandate_parties;

reset role;
\echo '--- vue admin : numéro attribué au mandat ---'
select mandate_number from mandates where id = :'hevrest_id';
