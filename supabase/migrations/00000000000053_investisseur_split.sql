-- Éclate la catégorie "investisseur" unique en 3 tableaux distincts :
-- investisseur_france (garde exactement le cheminement existant), et deux
-- nouveaux marchés avec un cheminement différent, investisseur_dubai et
-- investisseur_georgie (Nouveau lead > R1 > R2 > EOI > Réservation > Vendu).
-- Les nouveaux prospects sont ensuite routés vers le bon tableau via le
-- mapping campagne → tableau existant (Réglages > Campagnes,
-- meta_campaigns.target_category), déjà branché sur leads.category.

-- 1. Élargit la contrainte de leads.category (et migre les lignes existantes
--    AVANT de resserrer la contrainte, pour ne jamais avoir de ligne
--    temporairement invalide).
alter table leads drop constraint if exists leads_category_check;
update leads set category = 'investisseur_france' where category = 'investisseur';
alter table leads add constraint leads_category_check
  check (category in ('acheteur', 'vendeur', 'investisseur_france', 'investisseur_dubai', 'investisseur_georgie'));

-- 2. Même chose pour le mapping campagne → catégorie.
alter table meta_campaigns drop constraint if exists meta_campaigns_target_category_check;
update meta_campaigns set target_category = 'investisseur_france' where target_category = 'investisseur';
alter table meta_campaigns add constraint meta_campaigns_target_category_check
  check (target_category in ('acheteur', 'vendeur', 'investisseur_france', 'investisseur_dubai', 'investisseur_georgie'));

-- 3. Renomme les colonnes existantes du tableau investisseur (même
--    cheminement, juste rattaché au nouveau board_type) et crée les colonnes
--    des 2 nouveaux tableaux pour chaque agence existante.
update pipeline_columns set board_type = 'investisseur_france' where board_type = 'investisseur';

do $$
declare
  a record;
begin
  for a in select id from agencies loop
    if not exists (select 1 from pipeline_columns where agency_id = a.id and board_type = 'investisseur_dubai') then
      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default) values
        (a.id, 'investisseur_dubai', 'Nouveau lead', 'slate', 0, true),
        (a.id, 'investisseur_dubai', 'R1', 'teal', 1, true),
        (a.id, 'investisseur_dubai', 'R2', 'sage', 2, true),
        (a.id, 'investisseur_dubai', 'EOI', 'gold', 3, true),
        (a.id, 'investisseur_dubai', 'Réservation', 'brick', 4, true),
        (a.id, 'investisseur_dubai', 'Vendu', 'success', 5, true);
    end if;
    if not exists (select 1 from pipeline_columns where agency_id = a.id and board_type = 'investisseur_georgie') then
      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default) values
        (a.id, 'investisseur_georgie', 'Nouveau lead', 'slate', 0, true),
        (a.id, 'investisseur_georgie', 'R1', 'teal', 1, true),
        (a.id, 'investisseur_georgie', 'R2', 'sage', 2, true),
        (a.id, 'investisseur_georgie', 'EOI', 'gold', 3, true),
        (a.id, 'investisseur_georgie', 'Réservation', 'brick', 4, true),
        (a.id, 'investisseur_georgie', 'Vendu', 'success', 5, true);
    end if;
  end loop;
end $$;

-- 4. Met à jour le seed utilisé à la création d'une nouvelle agence, pour que
--    les 5 tableaux (vendeur/acheteur/investisseur_france/_dubai/_georgie)
--    soient créés dès le départ.
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
    (p_agency_id, 'vendeur', 'RDV 2 finalisé', 'brick', 4, true),
    (p_agency_id, 'vendeur', 'Mandat signé', 'success', 5, true),
    (p_agency_id, 'acheteur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'acheteur', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'acheteur', 'RDV de visite', 'sage', 2, true),
    (p_agency_id, 'investisseur_france', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'investisseur_france', 'Qualifié', 'teal', 1, true),
    (p_agency_id, 'investisseur_france', 'RDV 1', 'sage', 2, true),
    (p_agency_id, 'investisseur_france', 'Validation de financement', 'gold', 3, true),
    (p_agency_id, 'investisseur_france', 'Mandat de recherche', 'success', 4, true),
    (p_agency_id, 'investisseur_dubai', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'investisseur_dubai', 'R1', 'teal', 1, true),
    (p_agency_id, 'investisseur_dubai', 'R2', 'sage', 2, true),
    (p_agency_id, 'investisseur_dubai', 'EOI', 'gold', 3, true),
    (p_agency_id, 'investisseur_dubai', 'Réservation', 'brick', 4, true),
    (p_agency_id, 'investisseur_dubai', 'Vendu', 'success', 5, true),
    (p_agency_id, 'investisseur_georgie', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'investisseur_georgie', 'R1', 'teal', 1, true),
    (p_agency_id, 'investisseur_georgie', 'R2', 'sage', 2, true),
    (p_agency_id, 'investisseur_georgie', 'EOI', 'gold', 3, true),
    (p_agency_id, 'investisseur_georgie', 'Réservation', 'brick', 4, true),
    (p_agency_id, 'investisseur_georgie', 'Vendu', 'success', 5, true);
end;
$$;

-- 5. Commission Dubaï/Géorgie : pas de mandat pour ces 2 marchés (pas de
--    "recherche" à la française), donc pas d'automatisation possible via le
--    barème d'honoraires existant (lib/rive/mandates.ts, pensé pour des
--    ventes/mandats français) — saisie manuelle à la place, un simple champ
--    sur la fiche du prospect.
alter table leads add column if not exists investor_commission numeric;
comment on column leads.investor_commission is
  'Commission (€), saisie manuelle — utilisé pour les prospects investisseur_dubai/investisseur_georgie, qui ne passent pas par un mandat.';