-- Step 8G-7: allow authenticated users to mark only visible notifications as read.

create or replace function public.mark_notification_read(p_notification_id uuid)
returns table(notification_id uuid, status text, read_at timestamptz)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_notification public.notifications%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select *
    into v_notification
    from public.notifications n
   where n.id = p_notification_id
     and public.can_access_company(n.company_id)
     and (
       n.user_id is null
       or n.user_id = auth.uid()
       or public.can_manage_company(n.company_id)
     )
   for update;

  if not found then
    raise exception 'NOTIFICATION_UNAVAILABLE' using errcode = '42501';
  end if;

  if v_notification.status = 'unread' then
    update public.notifications n
       set status = 'read',
           read_at = coalesce(n.read_at, now())
     where n.id = v_notification.id
     returning n.id, n.status, n.read_at
          into notification_id, status, read_at;
  else
    notification_id := v_notification.id;
    status := v_notification.status;
    read_at := v_notification.read_at;
  end if;

  return next;
end;
$function$;

revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
