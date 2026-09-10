-- Ajoute une étape "RDV 2 finalisé" au tableau Vendeurs, juste avant
-- "Mandat signé" : le rendez-vous d'estimation a eu lieu, mais rien n'est
-- encore signé. C'est ce palier — pas "nouveau lead sans retour" — qui
-- déclenche désormais la relance automatique côté vendeur (voir
-- lib/rive/relance-agent.ts, processVendeurStalledRelances).

do $$
declare
  a record;
begin
  for a in select id from agencies loop
    if not exists (
      select 1 from pipeline_columns
      where agency_id = a.id and board_type = 'vendeur' and name = 'RDV 2 finalisé'
    ) then
      -- Décale "Mandat signé" (et toute étape ajoutée après) d'une position
      -- pour laisser la place à "RDV 2 finalisé" juste avant elle.
      update pipeline_columns
        set position = position + 1
        where agency_id = a.id and board_type = 'vendeur' and position >= 4;

      insert into pipeline_columns (agency_id, board_type, name, color, position, is_default)
        values (a.id, 'vendeur', 'RDV 2 finalisé', 'brick', 4, true);
    end if;
  end loop;
end $$;

-- Seed utilisé à la création d'une nouvelle agence.
create or replace function seed_default_pipeline_columns(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pipeline_columns (agency_id, board_type, name, color, position, is_default) values
    (p_agency_id, 'prospects', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'prospects', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'prospects', 'Qualifié', 'gold', 2, true),
    (p_agency_id, 'prospects', 'Client actif', 'success', 3, true),
    (p_agency_id, 'prospects', 'Finalisé', 'plum', 4, true),
    (p_agency_id, 'prospects', 'Sans suite', 'sand', 5, true),
    (p_agency_id, 'vendeur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'vendeur', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'vendeur', 'RDV 1 planifié', 'sage', 2, true),
    (p_agency_id, 'vendeur', 'RDV 2 planifié (estimation)', 'gold', 3, true),
    (p_agency_id, 'vendeur', 'RDV 2 finalisé', 'brick', 4, true),
    (p_agency_id, 'vendeur', 'Mandat signé', 'success', 5, true),
    (p_agency_id, 'acheteur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'acheteur', 'Contacté', 'teal', 1, true),
    (p_agency_id, 'acheteur', 'RDV de visite', 'sage', 2, true),
    (p_agency_id, 'investisseur', 'Nouveau lead', 'slate', 0, true),
    (p_agency_id, 'investisseur', 'Qualifié', 'teal', 1, true),
    (p_agency_id, 'investisseur', 'RDV 1', 'sage', 2, true),
    (p_agency_id, 'investisseur', 'Validation de financement', 'gold', 3, true),
    (p_agency_id, 'investisseur', 'Mandat de recherche', 'success', 4, true);
end;
$$;

-- État de la relance "vendeur bloqué en RDV 2 finalisé" (J+7 / J+15 / J+30) —
-- même principe que lead_relance_state (migration 027), table séparée car un
-- même vendeur peut en théorie être concerné par les deux séquences à des
-- moments différents (nouveau lead sans retour, puis bloqué après RDV2).
create table if not exists vendeur_stall_relance_state (
  lead_id uuid primary key references leads(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  reference_date date not null,
  last_step text check (last_step in ('j7', 'j15', 'j30')),
  updated_at timestamptz not null default now()
);

alter table vendeur_stall_relance_state enable row level security;

drop policy if exists "vendeur_stall_relance_state: select own agency" on vendeur_stall_relance_state;
drop policy if exists "vendeur_stall_relance_state: all own agency" on vendeur_stall_relance_state;
create policy "vendeur_stall_relance_state: all own agency" on vendeur_stall_relance_state
  for all using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());