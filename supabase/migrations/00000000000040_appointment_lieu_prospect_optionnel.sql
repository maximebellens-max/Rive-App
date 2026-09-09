-- Rendez-vous plus libres : un lieu, et un prospect qui n'est plus
-- obligatoire (un RDV interne, une visite de courtoisie ou tout autre
-- rendez-vous sans prospect attaché doit pouvoir se poser sur l'agenda).

alter table appointments add column if not exists lieu text not null default '';
alter table appointments alter column lead_id drop not null;