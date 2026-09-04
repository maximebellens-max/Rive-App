-- Permet à chaque agent d'envoyer ses propres alertes WhatsApp depuis son
-- propre numéro professionnel dédié, plutôt qu'un seul numéro partagé pour
-- toute l'agence — les deux numéros restent rattachés au même compte
-- WhatsApp Business (WABA), donc au même jeton d'accès permanent et aux
-- mêmes modèles approuvés (pas besoin de tout reconfigurer côté Meta pour
-- chaque agent, juste d'enregistrer son numéro sous la WABA existante).
-- Vide par défaut : dans ce cas, l'envoi retombe sur le numéro partagé
-- (variable d'environnement WHATSAPP_PHONE_NUMBER_ID).
alter table profiles add column if not exists whatsapp_sender_phone_number_id text not null default '';