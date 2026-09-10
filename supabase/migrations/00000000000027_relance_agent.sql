-- Agent de relance automatique : détecte plusieurs situations qui méritent
-- un rappel, rédige un brouillon de message via Claude, et alerte l'agent
-- par WhatsApp (jamais d'envoi automatique au client — voir
-- lib/rive/relance-agent.ts pour le détail de chaque déclencheur et le
-- rappel RGPD).

-- Suivi de la séquence "nouveau prospect sans retour" (J+3 / J+7 / J+14).
-- Une seule ligne par prospect : reference_date est la date à partir de
-- laquelle le délai se compte (création du prospect, ou date de la
-- dernière note ajoutée si plus récente — voir lib/rive/relance-agent.ts),
-- et last_step le dernier palier déjà envoyé pour cette reference_date.
create table if not exists lead_relance_state (
  lead_id uuid primary key references leads(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  reference_date date not null,
  last_step text check (last_step in ('j3', 'j7', 'j14')),
  updated_at timestamptz not null default now()
);

alter table lead_relance_state enable row level security;

-- La contrainte sur whatsapp_daily_alerts_sent.kind devait à l'origine être
-- élargie ici pour couvrir les nouveaux déclencheurs de l'agent de relance.
-- Retiré de ce fichier de rattrapage (dépôt le 10/09/2026) : la base réelle
-- a déjà une contrainte plus large que celle-ci (vérifié en base — elle
-- contient au moins 'appointment', 'mandate_renewal', 'mandate_anniversary'
-- et d'autres valeurs ajoutées depuis par du travail non documenté ici),
-- donc rejouer cette version plus étroite ferait échouer le dépôt (des
-- lignes existantes ont un "kind" hors de cette liste réduite). Rien à
-- faire : la fonctionnalité est déjà en place.