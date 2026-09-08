-- Photo de profil de l'agent, affichée en badge sur les cartes prospects,
-- clients et biens qui lui sont assignés. Stockée directement en base (data
-- URL base64, image déjà recadrée/compressée côté client avant l'envoi)
-- plutôt que dans un bucket de stockage séparé — évite d'avoir à configurer
-- et sécuriser un bucket Supabase Storage pour de très petites images.
alter table profiles add column if not exists avatar_url text not null default '';