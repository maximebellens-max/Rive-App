-- Bug trouvé : la synchronisation des campagnes utilisait le jeton d'accès
-- de la Page (stocké dans access_token, correct pour récupérer le détail
-- d'un lead via le webhook) au lieu du jeton utilisateur longue durée
-- (seul habilité à porter la permission ads_read nécessaire pour lister les
-- campagnes d'un compte publicitaire). Résultat : "Actualiser les
-- campagnes" échouait systématiquement avec une erreur trompeuse
-- ("jeton expiré ? reconnecte le compte"), même juste après une connexion
-- réussie.
alter table meta_connections add column if not exists user_access_token text;