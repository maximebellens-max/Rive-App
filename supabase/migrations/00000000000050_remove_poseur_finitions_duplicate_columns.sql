-- "Poseur" (ameublement) faisait doublon avec "Monteur" (même rôle, deux
-- colonnes) — supprimée du tableau Ameublement. Sur le tableau Cuisine,
-- "Poseur" et "Finitions" sont supprimées à la demande de l'agence (colonnes
-- jamais vraiment utilisées séparément du reste du suivi). Rien à voir avec
-- works_projects.chk_finitions (case à cocher du tableau Travaux), qui n'est
-- pas concernée par cette migration.
alter table furnishing_projects drop column if exists poseur;
alter table kitchen_projects drop column if exists poseur;
alter table kitchen_projects drop column if exists finitions;