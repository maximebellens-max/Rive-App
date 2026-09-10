-- Couleurs de colonnes personnalisées par agent : jusqu'ici la couleur d'une
-- colonne de pipeline (pipeline_columns.color) était partagée par toute
-- l'agence — un agent qui la changeait la changeait pour tout le monde. Ce
-- champ porte l'override personnel de chaque agent (colonne -> couleur),
-- sans toucher à pipeline_columns.color qui reste la couleur "par défaut" de
-- l'agence tant qu'un agent n'a pas fait son propre choix.
alter table profiles add column if not exists column_colors jsonb not null default '{}'::jsonb;

-- Collaborateurs sur un prospect : agents supplémentaires impliqués en plus
-- de l'agent responsable (leads.assigned_to, qui reste seul déterminant pour
-- l'onglet Aujourd'hui, le filtre "agent" des tableaux et les commissions) —
-- sert uniquement à afficher leur avatar sur les cartes en plus de celui de
-- l'agent responsable, purement informatif.
alter table leads add column if not exists collaborator_ids uuid[] not null default '{}'::uuid[];