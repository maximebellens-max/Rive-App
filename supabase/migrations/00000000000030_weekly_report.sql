-- Élargit la contrainte kind du dédoublonnage quotidien pour couvrir le
-- nouveau rapport hebdomadaire (un seul envoi par agence et par semaine,
-- même mécanisme que les autres digests WhatsApp).
alter table whatsapp_daily_alerts_sent drop constraint if exists whatsapp_daily_alerts_sent_kind_check;
alter table whatsapp_daily_alerts_sent add constraint whatsapp_daily_alerts_sent_kind_check
  check (kind in (
    'appointment', 'mandate_renewal', 'mandate_anniversary', 'lead_birthday',
    'year_end_wishes', 'google_review_request', 'estimation_stale', 'ai_priority_digest',
    'weekly_report'
  ));