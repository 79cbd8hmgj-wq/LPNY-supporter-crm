begin;

select plan(5);

select has_column(
  'public',
  'people',
  'merged_into_person_id',
  'people records expose merged-into linkage'
);

select ok(
  to_regprocedure('public.resolve_duplicate_candidate(uuid,text,uuid)') is not null,
  'duplicate resolution RPC exists'
);

select ok(
  not has_table_privilege('authenticated', 'public.duplicate_candidates', 'INSERT'),
  'authenticated cannot create duplicate candidates directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.duplicate_candidates', 'UPDATE'),
  'authenticated cannot bypass audited duplicate resolution updates'
);

select ok(
  not has_table_privilege('authenticated', 'public.duplicate_candidates', 'DELETE'),
  'authenticated cannot delete duplicate-candidate history'
);

select * from finish();
rollback;
