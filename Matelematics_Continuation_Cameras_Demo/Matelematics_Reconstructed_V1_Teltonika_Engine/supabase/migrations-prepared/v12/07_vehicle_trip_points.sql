create or replace function public.matelematics_vehicle_trip_points(
  p_vehicle_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_max_points integer default 1000
)
returns table (
  latitude double precision,
  longitude double precision,
  speed double precision,
  heading double precision,
  recorded_at timestamptz,
  raw_point_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with ordered as (
    select
      p.latitude,
      p.longitude,
      p.speed,
      p.heading,
      p.recorded_at,
      row_number() over (order by p.recorded_at, p.id) as rn,
      count(*) over ()::bigint as total_count
    from public.positions p
    where p.vehicle_id = p_vehicle_id
      and p.recorded_at >= p_from
      and p.recorded_at <= p_to
      and p.latitude is not null
      and p.longitude is not null
  ),
  prepared as (
    select
      o.*,
      greatest(
        1,
        ceil(
          o.total_count::numeric /
          greatest(1, least(coalesce(p_max_points, 1000), 2000))
        )::bigint
      ) as stride
    from ordered o
  )
  select
    pr.latitude,
    pr.longitude,
    pr.speed,
    pr.heading,
    pr.recorded_at,
    pr.total_count as raw_point_count
  from prepared pr
  where pr.rn = 1
     or pr.rn = pr.total_count
     or mod(pr.rn - 1, pr.stride) = 0
  order by pr.recorded_at;
$$;

revoke all on function public.matelematics_vehicle_trip_points(uuid, timestamptz, timestamptz, integer) from public;
revoke all on function public.matelematics_vehicle_trip_points(uuid, timestamptz, timestamptz, integer) from anon;
revoke all on function public.matelematics_vehicle_trip_points(uuid, timestamptz, timestamptz, integer) from authenticated;
grant execute on function public.matelematics_vehicle_trip_points(uuid, timestamptz, timestamptz, integer) to service_role;
