begin;

select plan(2);

select has_table(
  'public',
  'admin_audit_events',
  'append-only admin audit table exists'
);

select has_function(
  'private',
  'append_admin_audit',
  array['text', 'text', 'uuid', 'jsonb'],
  'private audit append helper exists'
);

select * from finish();
rollback;
