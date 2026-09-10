-- Bouton "✓ Traité" (onglet Aujourd'hui / fiche prospect) : ne fait plus
-- avancer le prospect dans son tableau (Vendeurs/Acheteurs/Investisseurs),
-- juste le sortir du widget "Nouveaux prospects à contacter" — l'avancée
-- dans le pipeline reste un geste manuel séparé (glisser-déposer la carte).
alter table leads add column if not exists marked_contacted boolean not null default false;