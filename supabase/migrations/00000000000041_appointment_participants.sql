-- Agents participant à un rendez-vous, en plus de celui qui l'a créé
-- (created_by) : simple tableau d'ids plutôt qu'une table de jointure — une
-- agence compte une poignée d'agents, pas des centaines, un uuid[] suffit et
-- évite une jointure supplémentaire à chaque lecture de l'agenda. Les alertes
-- WhatsApp de rendez-vous sont déjà diffusées à toute l'équipe opt-in
-- (broadcastToTeam, lib/rive/whatsapp-notify.ts) : ce champ sert avant tout à
-- afficher qui est concerné par le RDV sur l'agenda, pas à router les alertes.
alter table appointments add column if not exists participant_ids uuid[] not null default '{}';