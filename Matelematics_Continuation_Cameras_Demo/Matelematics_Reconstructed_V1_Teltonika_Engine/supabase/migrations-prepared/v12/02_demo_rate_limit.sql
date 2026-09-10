-- ============================================================
-- MATELEMATICS
-- DEMO API RATE LIMIT
-- Persistent anti-abuse protection for public demo requests
-- ============================================================

create schema if not exists private;


create table if not exists private.api_rate_limits (
  rate_key text primary key,

  window_started_at timestamptz not null,

  request_count integer not null
    check (request_count >= 0),

  updated_at timestamptz not null
    default now()
);


comment on table private.api_rate_limits is
  'Persistent counters used by Matelematics server-side API rate limiting. Keys are hashed before storage.';


comment on column private.api_rate_limits.rate_key is
  'SHA-256 derived rate-limit key. Raw client IP addresses are not stored.';


comment on column private.api_rate_limits.window_started_at is
  'Start timestamp of the active fixed rate-limit window.';


comment on column private.api_rate_limits.request_count is
  'Number of attempts recorded during the active window, capped by the consuming function.';


comment on column private.api_rate_limits.updated_at is
  'Timestamp of the most recent rate-limit attempt.';


grant usage on schema private
to service_role;


revoke all
on table private.api_rate_limits
from public;


revoke all
on table private.api_rate_limits
from anon;


revoke all
on table private.api_rate_limits
from authenticated;


grant select, insert, update
on table private.api_rate_limits
to service_role;


create or replace function public.consume_demo_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row private.api_rate_limits%rowtype;
  v_window_end timestamptz;
begin
  if p_key is null
     or btrim(p_key) = ''
     or length(p_key) > 512 then
    raise exception
      'INVALID_RATE_LIMIT_KEY';
  end if;

  if p_limit is null
     or p_limit < 1
     or p_limit > 1000000 then
    raise exception
      'INVALID_RATE_LIMIT_LIMIT';
  end if;

  if p_window_seconds is null
     or p_window_seconds < 1
     or p_window_seconds > 31536000 then
    raise exception
      'INVALID_RATE_LIMIT_WINDOW';
  end if;


  insert into private.api_rate_limits as current_limit (
    rate_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_key,
    v_now,
    1,
    v_now
  )
  on conflict (rate_key)
  do update
  set
    window_started_at =
      case
        when current_limit.window_started_at
          + make_interval(secs => p_window_seconds)
          <= v_now
        then v_now
        else current_limit.window_started_at
      end,

    request_count =
      case
        when current_limit.window_started_at
          + make_interval(secs => p_window_seconds)
          <= v_now
        then 1
        else least(
          current_limit.request_count + 1,
          p_limit + 1
        )
      end,

    updated_at = v_now
  returning *
  into v_row;


  allowed :=
    v_row.request_count <= p_limit;

  remaining :=
    greatest(
      p_limit - v_row.request_count,
      0
    );


  if allowed then
    retry_after_seconds := 0;
  else
    v_window_end :=
      v_row.window_started_at
      + make_interval(
          secs => p_window_seconds
        );

    retry_after_seconds :=
      greatest(
        1,
        ceil(
          extract(
            epoch
            from (
              v_window_end - v_now
            )
          )
        )::integer
      );
  end if;


  return next;
end;
$$;


comment on function public.consume_demo_rate_limit(
  text,
  integer,
  integer
) is
  'Atomically consumes one request from a fixed rate-limit window and returns whether it is allowed, remaining quota and Retry-After seconds.';


revoke all
on function public.consume_demo_rate_limit(
  text,
  integer,
  integer
)
from public;


revoke all
on function public.consume_demo_rate_limit(
  text,
  integer,
  integer
)
from anon;


revoke all
on function public.consume_demo_rate_limit(
  text,
  integer,
  integer
)
from authenticated;


grant execute
on function public.consume_demo_rate_limit(
  text,
  integer,
  integer
)
to service_role;
