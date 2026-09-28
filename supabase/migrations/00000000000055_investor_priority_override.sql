-- Niveau d'intérêt choisi à la main pour un prospect investisseur (chaud /
-- tiède / froid), qui prend le pas sur le calcul automatique. Le calcul
-- automatique reste utile par défaut, mais pour un investisseur les facteurs
-- utilisés pour un vendeur (financement, échéance de RDV...) ne collent pas
-- toujours — l'agent doit pouvoir trancher lui-même. Ce champ concerne en
-- pratique surtout les 3 tableaux investisseur, mais n'est pas restreint en
-- base à ces catégories : rien n'empêche de s'en servir ailleurs plus tard.
alter table leads add column if not exists priority_tier_override text
  check (priority_tier_override in ('chaud', 'tiede', 'froid'));

comment on column leads.priority_tier_override is
  'Niveau d''intérêt choisi manuellement (chaud/tiede/froid) — prioritaire sur le score calculé automatiquement. NULL = calcul automatique.';