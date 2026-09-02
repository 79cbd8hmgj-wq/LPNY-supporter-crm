create table public.intake_rate_limits (
  client_hash text primary key check (client_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create index intake_rate_limits_updated_at_idx
  on public.intake_rate_limits (updated_at);

alter table public.intake_rate_limits enable row level security;

revoke all on table public.intake_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.intake_rate_limits to service_role;

create or replace function public.consume_intake_rate_limit(
  p_client_hash text,
  p_window_seconds integer default 900,
  p_limit integer default 5
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_cutoff timestamptz;
  v_count integer;
begin
  if p_client_hash is null or p_client_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid client hash' using errcode = '22023';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit window' using errcode = '22023';
  end if;

  if p_limit < 1 or p_limit > 100 then
    raise exception 'invalid rate-limit threshold' using errcode = '22023';
  end if;

  v_cutoff := v_now - make_interval(secs => p_window_seconds);

  delete from public.intake_rate_limits
   where updated_at < v_now - interval '1 day';

  insert into public.intake_rate_limits as limits (
    client_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_client_hash,
    v_now,
    1,
    v_now
  )
  on conflict (client_hash) do update
  set
    request_count = case
      when limits.window_started_at <= v_cutoff then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.window_started_at <= v_cutoff then v_now
      else limits.window_started_at
    end,
    updated_at = v_now
  returning request_count into v_count;

  return v_count > p_limit;
end;
$$;

revoke all on function public.consume_intake_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_intake_rate_limit(text, integer, integer) to service_role;
