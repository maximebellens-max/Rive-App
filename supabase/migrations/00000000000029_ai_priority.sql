-- Priorisation IA des prospects : deux champs sur leads pour stocker le
-- score ajusté par l'IA (recalculé chaque nuit, voir lib/rive/ai-priority.ts)
-- et la raison en une phrase. ai_priority_score reste NULL tant que le cron
-- ne l'a pas encore calculé une première fois — le kanban retombe alors sur
-- le score de règles existant (lib/rive/pipelines.ts).
alter table leads add column if not exists ai_priority_score integer;
alter table leads add column if not exists ai_priority_reasoning text not null default '';

-- Élargit la contrainte kind du dédoublonnage quotidien pour couvrir le
-- nouveau digest WhatsApp "Priorités du jour".
alter table whatsapp_daily_alerts_sent drop constraint if exists whatsapp_daily_alerts_sent_kind_check;
alter table whatsapp_daily_alerts_sent add constraint whatsapp_daily_alerts_sent_kind_check
  check (kind in (
    'appointment', 'mandate_renewal', 'mandate_anniversary', 'lead_birthday',
    'year_end_wishes', 'google_review_request', 'estimation_stale', 'ai_priority_digest'
  ));