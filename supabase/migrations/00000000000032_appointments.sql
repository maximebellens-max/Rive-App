-- Rendez-vous d'agenda comme entité à part entière, plutôt que les deux
-- champs action_label/action_date directement sur le lead : un prospect
-- pouvait auparavant n'avoir qu'un seul "prochain rendez-vous" (en ajouter
-- un second écrasait le premier), et sans heure. On garde quand même
-- leads.action_label/action_date en synchro (voir lib/rive/appointments.ts)
-- car ces deux champs sont lus par la priorisation IA, l'agent de relance,
-- le cron WhatsApp du matin et l'export ICS — les remplacer partout aurait
-- été un chantier bien plus large pour un même résultat.
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  label text not null default '',
  appointment_date date not null,
  appointment_time time,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_lead_id_idx on appointments (lead_id);
create index if not exists appointments_agency_date_idx on appointments (agency_id, appointment_date);

alter table appointments enable row level security;

drop policy if exists "appointments: select own agency" on appointments;
drop policy if exists "appointments: insert own agency" on appointments;
drop policy if exists "appointments: update own agency" on appointments;
drop policy if exists "appointments: delete own agency" on appointments;
create policy "appointments: select own agency" on appointments for select using (agency_id = current_agency_id());
create policy "appointments: insert own agency" on appointments for insert with check (agency_id = current_agency_id());
create policy "appointments: update own agency" on appointments for update using (agency_id = current_agency_id());
create policy "appointments: delete own agency" on appointments for delete using (agency_id = current_agency_id());

-- Reprend les rendez-vous déjà posés sur les leads (action_date non nul)
-- pour ne rien perdre au moment du passage à la nouvelle table.
insert into appointments (agency_id, lead_id, label, appointment_date, created_at)
select agency_id, id, coalesce(nullif(action_label, ''), 'Rendez-vous'), action_date, now()
from leads
where action_date is not null;