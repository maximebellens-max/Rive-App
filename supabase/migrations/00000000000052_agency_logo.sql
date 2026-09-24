-- Logo de l'agence, affiché en en-tête de l'aperçu du contrat en direct et
-- du PDF final (mandat, etc.). Même principe de stockage que la photo de
-- profil (voir profiles.avatar_url) : l'image est déjà redimensionnée et
-- compressée côté client avant l'envoi (voir agency-logo-upload.tsx), puis
-- stockée directement en base sous forme de data URL — pas besoin d'un
-- bucket de stockage séparé pour une image aussi petite.
alter table agencies add column if not exists logo_url text not null default '';