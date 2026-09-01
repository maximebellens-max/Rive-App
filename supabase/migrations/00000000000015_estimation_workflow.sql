-- Retravaille le flux "nouvelle estimation" pour suivre le bon schéma
-- logique : bien/contact → caractéristiques → charges → fourchette
-- automatique (secteur) → comparaison (DVF + biens en vente actuellement).

-- Charges annuelles du bien, saisies dès l'étape d'estimation — avant même
-- de connaître le prix de vente, contrairement au prix qui n'a pas sa place
-- à ce stade.
alter table mandates add column if not exists annual_energy_cost numeric;
alter table mandates add column if not exists property_tax numeric;
alter table mandates add column if not exists other_charges numeric;
alter table mandates add column if not exists other_charges_note text not null default '';

-- Distingue, dans les comparables saisis à la main, les ventes DVF
-- (transactions réellement enregistrées) des biens actuellement en vente
-- sur les portails (annonces concurrentes, prix demandé et non prix vendu).
alter table dvf_comparables add column if not exists is_active_listing boolean not null default false;