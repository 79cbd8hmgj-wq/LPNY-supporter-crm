begin;

select plan(8);

select ok(
  to_regclass('public.intake_rate_limits') is not null,
  'Intake rate-limit bucket table exists'
);

select ok(
  to_regprocedure('public.consume_intake_rate_limit(text,integer,integer)') is not null,
  'Intake rate-limit RPC exists'
);

select ok(
  not has_table_privilege('anon', 'public.intake_rate_limits', 'SELECT'),
  'Anonymous callers cannot read rate-limit buckets'
);

select ok(
  not has_table_privilege('authenticated', 'public.intake_rate_limits', 'SELECT'),
  'Authenticated staff cannot read rate-limit buckets directly'
);

select ok(
  has_function_privilege('service_role', 'public.consume_intake_rate_limit(text,integer,integer)', 'EXECUTE'),
  'Service role can execute the intake rate-limit RPC'
);

set local role service_role;

select is(
  public.consume_intake_rate_limit(repeat('a', 64), 900, 5),
  false,
  'First request in a fresh window is allowed'
);

do $$
begin
  perform public.consume_intake_rate_limit(repeat('a', 64), 900, 5);
  perform public.consume_intake_rate_limit(repeat('a', 64), 900, 5);
  perform public.consume_intake_rate_limit(repeat('a', 64), 900, 5);
  perform public.consume_intake_rate_limit(repeat('a', 64), 900, 5);
end
$$;

select is(
  public.consume_intake_rate_limit(repeat('a', 64), 900, 5),
  true,
  'Sixth request in the window is rate limited'
);

update public.intake_rate_limits
set window_started_at = now() - interval '16 minutes'
where client_hash = repeat('a', 64);

select is(
  public.consume_intake_rate_limit(repeat('a', 64), 900, 5),
  false,
  'Expired windows reset before counting the next request'
);

reset role;

select * from finish();
rollback;
