create or replace function public.matelematics_vehicle_trip_summaries(
  p_vehicle_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  trip_key text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds bigint,
  distance_km double precision,
  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision,
  point_count bigint,
  avg_speed double precision,
  max_speed double precision,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with moving_points as (
    select
      p.id,
      p.recorded_at,
      p.latitude,
      p.longitude,
      coalesce(p.speed, 0)::double precision as speed,
      lag(p.recorded_at) over (order by p.recorded_at, p.id) as prev_moving_at,
      lag(p.latitude) over (order by p.recorded_at, p.id) as prev_lat,
      lag(p.longitude) over (order by p.recorded_at, p.id) as prev_lng
    from public.positions p
    where p.vehicle_id = p_vehicle_id
      and p.recorded_at >= p_from
      and p.recorded_at <= p_to
      and p.latitude is not null
      and p.longitude is not null
      and coalesce(p.speed, 0) > 2
  ),
  marked as (
    select
      mp.*,
      case
        when mp.prev_moving_at is null
          or mp.recorded_at - mp.prev_moving_at > interval '5 minutes'
        then 1
        else 0
      end as new_trip
    from moving_points mp
  ),
  grouped as (
    select
      m.*,
      sum(m.new_trip) over (order by m.recorded_at, m.id) as trip_no
    from marked m
  ),
  with_distance as (
    select
      g.*,
      case
        when g.new_trip = 1 or g.prev_lat is null or g.prev_lng is null then 0.0
        else 6371.0 * 2.0 * asin(
          least(
            1.0,
            sqrt(
              power(sin(radians(g.latitude - g.prev_lat) / 2.0), 2)
              + cos(radians(g.prev_lat)) * cos(radians(g.latitude))
                * power(sin(radians(g.longitude - g.prev_lng) / 2.0), 2)
            )
          )
        )
      end as segment_km
    from grouped g
  ),
  raw_trips as (
    select
      wd.trip_no,
      min(wd.recorded_at) as started_at,
      max(wd.recorded_at) as ended_at,
      (array_agg(wd.latitude order by wd.recorded_at, wd.id))[1] as start_lat,
      (array_agg(wd.longitude order by wd.recorded_at, wd.id))[1] as start_lng,
      (array_agg(wd.latitude order by wd.recorded_at desc, wd.id desc))[1] as end_lat,
      (array_agg(wd.longitude order by wd.recorded_at desc, wd.id desc))[1] as end_lng,
      count(*)::bigint as point_count,
      sum(wd.segment_km)::double precision as distance_km,
      avg(wd.speed)::double precision as avg_speed,
      max(wd.speed)::double precision as max_speed
    from with_distance wd
    group by wd.trip_no
  ),
  valid_trips as (
    select rt.*
    from raw_trips rt
    where rt.ended_at > rt.started_at
      and rt.distance_km >= 0.1
  ),
  numbered as (
    select
      vt.*,
      count(*) over ()::bigint as total_count
    from valid_trips vt
  )
  select
    concat(
      to_char(n.started_at at time zone 'UTC', 'YYYYMMDDHH24MISSMS'),
      '-',
      to_char(n.ended_at at time zone 'UTC', 'YYYYMMDDHH24MISSMS')
    ) as trip_key,
    n.started_at,
    n.ended_at,
    floor(extract(epoch from (n.ended_at - n.started_at)))::bigint as duration_seconds,
    n.distance_km,
    n.start_lat,
    n.start_lng,
    n.end_lat,
    n.end_lng,
    n.point_count,
    n.avg_speed,
    n.max_speed,
    n.total_count
  from numbered n
  order by n.started_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.matelematics_vehicle_trip_summaries(uuid, timestamptz, timestamptz, integer, integer) from public;
revoke all on function public.matelematics_vehicle_trip_summaries(uuid, timestamptz, timestamptz, integer, integer) from anon;
revoke all on function public.matelematics_vehicle_trip_summaries(uuid, timestamptz, timestamptz, integer, integer) from authenticated;
grant execute on function public.matelematics_vehicle_trip_summaries(uuid, timestamptz, timestamptz, integer, integer) to service_role;
