-- Cloche de notifications dans l'en-tête de Rive : marque toutes les
-- notifications non lues de l'agence de l'utilisateur courant comme lues par
-- lui. En security definer pour pouvoir modifier des notifications qui
-- appartiennent à d'autres membres de l'agence (elles sont partagées, pas
-- personnelles), en vérifiant nous-mêmes l'appartenance à l'agence puisque
-- la RLS ne s'applique pas à l'intérieur d'une fonction security definer.
create or replace function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_uid uuid;
begin
  v_uid := auth.uid();
  v_agency_id := current_agency_id();

  if v_agency_id is null then
    return;
  end if;

  update notifications
  set read_by = array_append(read_by, v_uid)
  where agency_id = v_agency_id
    and not (read_by @> array[v_uid]);
end;
$$;

grant execute on function public.mark_notifications_read() to authenticated;