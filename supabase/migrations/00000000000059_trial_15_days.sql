-- Réduit la période d'essai gratuit proposée aux nouvelles agences de 30 à
-- 15 jours (décision commerciale — voir lib/rive/billing/plans.ts,
-- TRIAL_DAYS, qui doit rester alignée avec cette valeur pour l'affichage).
-- Ne change QUE le défaut appliqué à l'inscription (handle_new_user, voir
-- migration 00000000000001) : les agences déjà en essai gardent la date de
-- fin déjà calculée avec l'ancienne durée, rien n'est recalculé.
alter table agencies alter column trial_ends_at set default (now() + interval '15 days');