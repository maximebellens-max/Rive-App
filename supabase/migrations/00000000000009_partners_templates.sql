-- Contacts pro (notaires, banques, artisans...) et modèles de messages
-- SMS/Email réutilisables, repris à l'identique du prototype Rive.
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists partners_agency_id_idx on partners (agency_id);

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  channel text not null default 'sms' check (channel in ('sms', 'email')),
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists message_templates_agency_id_idx on message_templates (agency_id);

alter table partners enable row level security;
alter table message_templates enable row level security;

drop policy if exists "partners: select own agency" on partners;
drop policy if exists "partners: insert own agency" on partners;
drop policy if exists "partners: update own agency" on partners;
drop policy if exists "partners: delete own agency" on partners;
create policy "partners: select own agency" on partners for select using (agency_id = current_agency_id());
create policy "partners: insert own agency" on partners for insert with check (agency_id = current_agency_id());
create policy "partners: update own agency" on partners for update using (agency_id = current_agency_id());
create policy "partners: delete own agency" on partners for delete using (agency_id = current_agency_id());

drop policy if exists "message_templates: select own agency" on message_templates;
drop policy if exists "message_templates: insert own agency" on message_templates;
drop policy if exists "message_templates: update own agency" on message_templates;
drop policy if exists "message_templates: delete own agency" on message_templates;
create policy "message_templates: select own agency" on message_templates for select using (agency_id = current_agency_id());
create policy "message_templates: insert own agency" on message_templates for insert with check (agency_id = current_agency_id());
create policy "message_templates: update own agency" on message_templates for update using (agency_id = current_agency_id());
create policy "message_templates: delete own agency" on message_templates for delete using (agency_id = current_agency_id());

-- ---------- modèles par défaut ----------
create or replace function seed_default_templates(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into message_templates (agency_id, name, channel, subject, body) values
    (p_agency_id, 'Confirmation de RDV', 'sms', '',
     'Bonjour {{prenom}}, je vous confirme notre rendez-vous le {{date}}. À très vite, {{agent}}.'),
    (p_agency_id, 'Relance après visite', 'sms', '',
     'Bonjour {{prenom}}, suite à votre visite, n''hésitez pas à me faire part de vos impressions. {{agent}}.'),
    (p_agency_id, 'Envoi de l''estimation', 'email', 'Votre estimation',
     'Bonjour {{prenom}},

Veuillez trouver ci-joint l''estimation de votre bien.

Cordialement,
{{agent}}'),
    (p_agency_id, 'Suivi post-signature', 'email', 'Merci pour votre confiance',
     'Bonjour {{prenom}},

Merci pour votre confiance. Je reste à votre disposition pour toute question.

Cordialement,
{{agent}}');
end;
$$;

do $$
declare
  a record;
begin
  for a in select id from agencies loop
    if not exists (select 1 from message_templates where agency_id = a.id) then
      perform seed_default_templates(a.id);
    end if;
  end loop;
end $$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_agency_id uuid;
  agency_name text;
begin
  agency_name := coalesce(new.raw_user_meta_data->>'agency_name', 'Mon agence');
  insert into agencies (name) values (agency_name) returning id into new_agency_id;
  insert into profiles (id, agency_id, full_name, role)
    values (new.id, new_agency_id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'owner');
  perform seed_default_pipeline_columns(new_agency_id);
  perform seed_default_templates(new_agency_id);
  return new;
end;
$$;
