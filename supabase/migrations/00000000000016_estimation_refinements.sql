-- Affine le moteur d'estimation : surface de terrain (bâti seul ne suffit
-- pas à valoriser une maison), et un ajustement manuel en % pour que l'agent
-- puisse corriger la fourchette calculée quand le bien diffère nettement des
-- comparables (état, prestations, vue...) sans que ce soit déjà couvert par
-- les coefficients automatiques.
alter table mandates add column if not exists land_surface numeric;
alter table mandates add column if not exists manual_adjustment_pct numeric;
alter table mandates add column if not exists manual_adjustment_note text not null default '';

-- Surface de terrain des comparables (DVF ou biens en vente actuellement),
-- pour pouvoir comparer des biens avec un terrain de taille similaire.
alter table dvf_comparables add column if not exists land_surface numeric;