-- Le pipeline "Projets investisseur" s'arrêtait à "Travaux" : on ajoute la
-- suite logique du dossier — Cuisine, Ameublement puis Location — comme
-- étapes du même tableau, dans cet ordre. Le passage en "Travaux" fait
-- ensuite apparaître automatiquement le dossier dans les 3 tableaux de
-- "Suivi de chantier" (Ameublement, Cuisine, Travaux), et le passage en
-- "Location" dans le pipeline Location (voir app/actions/investments.ts,
-- moveInvestmentStage) — cette migration ne fait que rendre ces valeurs de
-- stage possibles.

alter table invest_projects drop constraint invest_projects_stage_check;
alter table invest_projects add constraint invest_projects_stage_check
  check (stage in ('mandat', 'compromis_signe', 'acte', 'travaux', 'cuisine', 'ameublement', 'location'));