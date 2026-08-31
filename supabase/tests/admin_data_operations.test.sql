begin;

select plan(8);

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

select ok(
  (select c.relrowsecurity
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'admin_audit_events'),
  'admin audit events has RLS enabled'
);

select ok(
  has_table_privilege('authenticated', 'public.admin_audit_events', 'SELECT'),
  'authenticated receives SELECT only so RLS can filter audit reads'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_events', 'INSERT'),
  'authenticated cannot insert audit rows directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_events', 'UPDATE'),
  'authenticated cannot update audit rows'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_events', 'DELETE'),
  'authenticated cannot delete audit rows'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.append_admin_audit(text,text,uuid,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute the private audit append helper directly'
);

select * from finish();
rollback;
