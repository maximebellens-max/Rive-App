-- Les formulaires Meta Lead Ads d'Hevrest posent plusieurs questions
-- personnalisées (type de bien, ville, idée de prix, bien déjà en vente,
-- délai souhaité) en plus du nom/email/téléphone — jusqu'ici entièrement
-- perdues par le webhook, qui n'extrayait que les coordonnées. Deux
-- formulaires différents sont utilisés (ordre et jeu de questions
-- différents), donc plutôt que de coder en dur chaque question, on capture
-- toute réponse qui n'a pas déjà sa place dans un champ existant.
alter table leads add column if not exists meta_answers jsonb not null default '[]'::jsonb;