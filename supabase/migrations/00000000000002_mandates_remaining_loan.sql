-- Ajoute le capital restant dû (nécessaire pour calculer le "net vendeur"
-- = prix - honoraires - capital restant dû), repris du prototype Rive.
alter table mandates add column if not exists remaining_loan numeric;
