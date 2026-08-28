-- État civil du prospect, saisi une fois sur sa fiche et réutilisé pour tout
-- mandat le concernant (évite de le ressaisir à chaque mandat).
alter table leads add column if not exists civility text not null default 'Monsieur';
alter table leads add column if not exists address text not null default '';
alter table leads add column if not exists birth_date date;
alter table leads add column if not exists birth_place text not null default '';
alter table leads add column if not exists nationality text not null default '';
alter table leads add column if not exists marital_status text not null default '';
