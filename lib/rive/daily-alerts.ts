// Dédoublonnage partagé "au plus une alerte par jour et par entité" pour les
// deux crons quotidiens (digest RDV/mandats et agent de relance), via la
// même table whatsapp_daily_alerts_sent.
import type { SupabaseClient } from '@supabase/supabase-js'

// Marque l'événement comme notifié pour aujourd'hui et renvoie true si
// c'était bien la première fois (sinon un précédent passage du cron l'a déjà
// envoyé, on ne renvoie pas de deuxième message).
export async function claimDailyAlert(
  supabase: SupabaseClient,
  agencyId: string,
  kind: string,
  entityId: string,
  today: string
): Promise<boolean> {
  const { data: inserted } = await supabase
    .from('whatsapp_daily_alerts_sent')
    .upsert(
      { agency_id: agencyId, kind, entity_id: entityId, alert_date: today },
      { onConflict: 'agency_id,kind,entity_id,alert_date', ignoreDuplicates: true }
    )
    .select('id')

  return !!inserted && inserted.length > 0
}