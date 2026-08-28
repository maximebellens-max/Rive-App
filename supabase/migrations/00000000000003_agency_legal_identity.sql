-- Informations légales de l'agence, nécessaires pour générer un mandat conforme
-- (loi 70-9 du 2 janvier 1970 / décret 72-678) : identité du Mandataire, carte
-- professionnelle, assurance RCP, et numérotation continue du registre des mandats.

alter table agencies add column if not exists legal_form text not null default '';
alter table agencies add column if not exists share_capital numeric;
alter table agencies add column if not exists siren text not null default '';
alter table agencies add column if not exists rcs_city text not null default '';
alter table agencies add column if not exists address text not null default '';
alter table agencies add column if not exists phone text not null default '';
alter table agencies add column if not exists email text not null default '';

alter table agencies add column if not exists legal_rep_civility text not null default 'Monsieur';
alter table agencies add column if not exists legal_rep_first_name text not null default '';
alter table agencies add column if not exists legal_rep_last_name text not null default '';

alter table agencies add column if not exists carte_pro_number text not null default '';
alter table agencies add column if not exists carte_pro_date date;
alter table agencies add column if not exists carte_pro_cci text not null default '';

alter table agencies add column if not exists insurer_name text not null default '';
alter table agencies add column if not exists insurer_address text not null default '';
alter table agencies add column if not exists insurer_policy_number text not null default '';

-- Prochain numéro à attribuer au registre des mandats. À ajuster une seule fois
-- dans les réglages pour prolonger la numérotation d'un outil précédent sans trou.
alter table agencies add column if not exists next_mandate_number integer not null default 1;

-- Numéro attribué au mandat dans le registre (attribué une seule fois, à la
-- première génération du PDF, via la fonction assign_mandate_number ci-dessous).
alter table mandates add column if not exists mandate_number integer;

-- Attribution atomique du prochain numéro de registre (évite toute collision
-- si deux mandats sont générés en même temps pour la même agence).
create or replace function assign_mandate_number(p_mandate_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_number integer;
begin
  select agency_id, mandate_number into v_agency_id, v_number
  from mandates where id = p_mandate_id;

  if v_agency_id is null then
    raise exception 'Mandat introuvable';
  end if;

  -- Vérifie que l'appelant appartient bien à cette agence (la RLS ne s'applique
  -- pas automatiquement à l'intérieur d'une fonction security definer).
  if v_agency_id <> current_agency_id() then
    raise exception 'Accès refusé';
  end if;

  if v_number is not null then
    return v_number;
  end if;

  update agencies set next_mandate_number = next_mandate_number + 1
  where id = v_agency_id
  returning next_mandate_number - 1 into v_number;

  update mandates set mandate_number = v_number where id = p_mandate_id;

  return v_number;
end;
$$;

grant execute on function assign_mandate_number(uuid) to authenticated;
