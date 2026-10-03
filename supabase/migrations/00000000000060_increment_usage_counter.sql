-- jusqu'ici, recordUsage() (lib/rive/billing/usage.ts) incrémentait
-- usage_counters par un select puis un update/insert fait depuis le code
-- applicatif, ce qui exigeait le client admin (service role) : la table n'a
-- qu'une policy RLS "select own agency", aucune policy d'écriture pour un
-- utilisateur authentifié (voir migration 057). Ça marchait pour les crons
-- (qui utilisent déjà le client admin), mais pas pour un appel fait depuis
-- une Server Action authentifiée (ex. app/actions/ai.ts, l'assistant
-- conversationnel) — jamais censé utiliser le client admin (voir le
-- commentaire de createAdminClient, lib/supabase/admin.ts). Cette fonction
-- comble cet écart : appelable par un utilisateur authentifié (elle vérifie
-- elle-même qu'il n'incrémente que SA propre agence), tout en restant
-- utilisable par les crons/webhooks (auth.uid() y est alors null, le
-- contrôle est ignoré — ces appelants ont déjà contourné RLS de toute
-- façon). Bonus : l'upsert est atomique, contrairement au select-puis-write
-- précédent.
--
-- ai_background_count : 2e compteur IA, distinct de ai_generations_count.
-- ai_generations_count ne compte QUE les générations déclenchées par un
-- agent (bouton "Générer", assistant conversationnel) — c'est lui que
-- aiUsageStatus() (lib/rive/billing/usage.ts) compare à aiMonthlyLimit pour
-- bloquer réellement. ai_background_count compte les générations des
-- automatisations (scoring de priorité nocturne, relances, rapport
-- hebdomadaire, message WhatsApp automatique) : suivi pour la visibilité du
-- coût, mais ne bloque jamais rien — chaque automatisation a déjà son
-- propre texte de repli si Claude ne répond pas (voir deploy-notes/rive-
-- commercialisation-prix-facturation.md), donc les compter dans le même
-- quota que l'usage manuel n'aurait fait que bloquer l'agent pour une
-- consommation qu'il n'a lui-même jamais déclenchée.
alter table usage_counters add column if not exists ai_background_count integer not null default 0;

create or replace function increment_usage_counter(p_agency_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
begin
  if p_kind not in ('ai', 'ai_background', 'whatsapp') then
    raise exception 'kind invalide: %', p_kind;
  end if;

  if auth.uid() is not null and p_agency_id is distinct from current_agency_id() then
    raise exception 'agence non autorisée';
  end if;

  insert into usage_counters (agency_id, month, ai_generations_count, ai_background_count, whatsapp_messages_count)
  values (
    p_agency_id,
    v_month,
    case when p_kind = 'ai' then 1 else 0 end,
    case when p_kind = 'ai_background' then 1 else 0 end,
    case when p_kind = 'whatsapp' then 1 else 0 end
  )
  on conflict (agency_id, month) do update set
    ai_generations_count = usage_counters.ai_generations_count + case when p_kind = 'ai' then 1 else 0 end,
    ai_background_count = usage_counters.ai_background_count + case when p_kind = 'ai_background' then 1 else 0 end,
    whatsapp_messages_count = usage_counters.whatsapp_messages_count + case when p_kind = 'whatsapp' then 1 else 0 end,
    updated_at = now();
end;
$$;

grant execute on function increment_usage_counter(uuid, text) to authenticated;