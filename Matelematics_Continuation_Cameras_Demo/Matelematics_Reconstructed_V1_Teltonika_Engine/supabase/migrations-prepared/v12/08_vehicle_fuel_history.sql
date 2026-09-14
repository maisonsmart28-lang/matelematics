create or replace function public.matelematics_vehicle_fuel_history(
  p_vehicle_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_max_points integer default 400
)
returns table (
  recorded_at timestamptz,
  fuel_level_percent double precision,
  fuel_used_litres double precision,
  odometer_km double precision,
  raw_count bigint,
  first_fuel_level_percent double precision,
  last_fuel_level_percent double precision,
  first_fuel_used_litres double precision,
  last_fuel_used_litres double precision,
  first_odometer_km double precision,
  last_odometer_km double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select
      t.recorded_at,
      case
        when jsonb_typeof(t.can_payload -> 'fuel_level_percent') = 'number'
          then (t.can_payload ->> 'fuel_level_percent')::double precision
        else null
      end as fuel_level_percent,
      case
        when jsonb_typeof(t.can_payload -> 'fuel_used_litres') = 'number'
          then (t.can_payload ->> 'fuel_used_litres')::double precision
        else null
      end as fuel_used_litres,
      case
        when jsonb_typeof(t.can_payload -> 'odometer_km') = 'number'
          then (t.can_payload ->> 'odometer_km')::double precision
        else null
      end as odometer_km
    from public.telemetry t
    where t.vehicle_id = p_vehicle_id
      and t.recorded_at >= p_from
      and t.recorded_at <= p_to
      and t.can_payload is not null
  ),
  usable as (
    select *
    from normalized
    where fuel_level_percent is not null
       or fuel_used_litres is not null
       or odometer_km is not null
  ),
  summary as (
    select
      count(*)::bigint as raw_count,
      (array_agg(fuel_level_percent order by recorded_at)
        filter (where fuel_level_percent is not null))[1] as first_fuel_level_percent,
      (array_agg(fuel_level_percent order by recorded_at desc)
        filter (where fuel_level_percent is not null))[1] as last_fuel_level_percent,
      (array_agg(fuel_used_litres order by recorded_at)
        filter (where fuel_used_litres is not null))[1] as first_fuel_used_litres,
      (array_agg(fuel_used_litres order by recorded_at desc)
        filter (where fuel_used_litres is not null))[1] as last_fuel_used_litres,
      (array_agg(odometer_km order by recorded_at)
        filter (where odometer_km is not null))[1] as first_odometer_km,
      (array_agg(odometer_km order by recorded_at desc)
        filter (where odometer_km is not null))[1] as last_odometer_km
    from usable
  ),
  ranked as (
    select
      u.*,
      row_number() over (order by u.recorded_at) as rn,
      count(*) over ()::bigint as total_rows
    from usable u
  ),
  sampled as (
    select r.*
    from ranked r
    where r.rn = 1
       or r.rn = r.total_rows
       or mod(
            r.rn - 1,
            greatest(
              1,
              ceil(
                r.total_rows::numeric /
                greatest(2, least(coalesce(p_max_points, 400), 1000))
              )::bigint
            )
          ) = 0
  )
  select
    s.recorded_at,
    s.fuel_level_percent,
    s.fuel_used_litres,
    s.odometer_km,
    m.raw_count,
    m.first_fuel_level_percent,
    m.last_fuel_level_percent,
    m.first_fuel_used_litres,
    m.last_fuel_used_litres,
    m.first_odometer_km,
    m.last_odometer_km
  from sampled s
  cross join summary m
  order by s.recorded_at;
$$;

revoke all on function public.matelematics_vehicle_fuel_history(uuid, timestamptz, timestamptz, integer) from public;
revoke all on function public.matelematics_vehicle_fuel_history(uuid, timestamptz, timestamptz, integer) from anon;
revoke all on function public.matelematics_vehicle_fuel_history(uuid, timestamptz, timestamptz, integer) from authenticated;
grant execute on function public.matelematics_vehicle_fuel_history(uuid, timestamptz, timestamptz, integer) to service_role;
