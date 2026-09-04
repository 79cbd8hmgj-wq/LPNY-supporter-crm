-- Supporter self-service profile editing.
-- Supporters may update only their own public-facing profile fields, interests,
-- and communication preferences. Internal CRM fields remain staff-only.

create or replace function public.list_supporter_interests()
returns table (
  slug text,
  name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.slug, i.name
  from public.interests i
  where private.is_supporter()
    and i.active
  order by i.name, i.slug
$$;

revoke all on function public.list_supporter_interests() from public, anon;
grant execute on function public.list_supporter_interests() to authenticated;

create or replace function public.update_my_supporter_profile(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_normalized_phone text,
  p_zip_code text,
  p_county_id uuid,
  p_municipality text,
  p_interest_slugs text[],
  p_email_opt_in boolean,
  p_phone_opt_in boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_slugs text[];
  v_requested_count integer;
  v_valid_count integer;
  v_email_state public.consent_state;
  v_sms_state public.consent_state;
  v_phone_state public.consent_state;
  v_email_target public.consent_state :=
    case when coalesce(p_email_opt_in, false) then 'opted_in'::public.consent_state else 'opted_out'::public.consent_state end;
  v_phone_target public.consent_state :=
    case when coalesce(p_phone_opt_in, false) then 'opted_in'::public.consent_state else 'opted_out'::public.consent_state end;
begin
  v_person_id := private.current_supporter_person_id();
  if v_person_id is null then
    raise exception 'supporter account required' using errcode = '42501';
  end if;

  if nullif(trim(p_first_name), '') is null
    or length(trim(p_first_name)) > 80
    or nullif(trim(p_last_name), '') is null
    or length(trim(p_last_name)) > 80
    or p_zip_code is null
    or p_zip_code !~ '^[0-9]{5}$'
    or (
      nullif(trim(coalesce(p_phone, '')), '') is not null
      and (
        p_normalized_phone is null
        or length(p_normalized_phone) < 7
        or length(p_normalized_phone) > 15
        or p_normalized_phone !~ '^[0-9]+$'
      )
    )
    or (
      nullif(trim(coalesce(p_phone, '')), '') is null
      and p_normalized_phone is not null
    )
  then
    raise exception 'invalid supporter profile' using errcode = '22023';
  end if;

  if p_county_id is not null
    and not exists (select 1 from public.counties c where c.id = p_county_id)
  then
    raise exception 'invalid county' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct lower(trim(slug))) filter (where nullif(trim(slug), '') is not null), '{}'::text[])
    into v_slugs
  from unnest(coalesce(p_interest_slugs, '{}'::text[])) as requested(slug);

  v_requested_count := coalesce(array_length(v_slugs, 1), 0);

  select count(*)
    into v_valid_count
  from public.interests i
  where i.active
    and i.slug = any(v_slugs);

  if v_valid_count <> v_requested_count then
    raise exception 'invalid supporter interests' using errcode = '22023';
  end if;

  update public.people
     set first_name = trim(p_first_name),
         last_name = trim(p_last_name),
         phone = nullif(trim(coalesce(p_phone, '')), ''),
         normalized_phone = p_normalized_phone,
         zip_code = p_zip_code,
         county_id = p_county_id,
         municipality = nullif(trim(coalesce(p_municipality, '')), '')
   where id = v_person_id
     and archived_at is null;

  if not found then
    raise exception 'supporter record unavailable' using errcode = 'P0002';
  end if;

  delete from public.person_interests
   where person_id = v_person_id;

  insert into public.person_interests (person_id, interest_id)
  select v_person_id, i.id
  from public.interests i
  where i.active
    and i.slug = any(v_slugs)
  on conflict do nothing;

  select ce.state
    into v_email_state
  from public.consent_events ce
  where ce.person_id = v_person_id
    and ce.channel = 'email'::public.consent_channel
  order by ce.effective_at desc, ce.id desc
  limit 1;

  if v_email_state is distinct from v_email_target then
    insert into public.consent_events (person_id, channel, state, metadata)
    values (
      v_person_id,
      'email',
      v_email_target,
      jsonb_build_object('source', 'supporter_portal')
    );
  end if;

  select ce.state
    into v_sms_state
  from public.consent_events ce
  where ce.person_id = v_person_id
    and ce.channel = 'sms'::public.consent_channel
  order by ce.effective_at desc, ce.id desc
  limit 1;

  if v_sms_state is distinct from v_phone_target then
    insert into public.consent_events (person_id, channel, state, metadata)
    values (
      v_person_id,
      'sms',
      v_phone_target,
      jsonb_build_object('source', 'supporter_portal')
    );
  end if;

  select ce.state
    into v_phone_state
  from public.consent_events ce
  where ce.person_id = v_person_id
    and ce.channel = 'phone'::public.consent_channel
  order by ce.effective_at desc, ce.id desc
  limit 1;

  if v_phone_state is distinct from v_phone_target then
    insert into public.consent_events (person_id, channel, state, metadata)
    values (
      v_person_id,
      'phone',
      v_phone_target,
      jsonb_build_object('source', 'supporter_portal')
    );
  end if;

  insert into public.activities (person_id, activity_type, metadata)
  values (
    v_person_id,
    'supporter_profile_updated',
    jsonb_build_object('source', 'supporter_portal')
  );
end;
$$;

revoke all on function public.update_my_supporter_profile(
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text[],
  boolean,
  boolean
) from public, anon;

grant execute on function public.update_my_supporter_profile(
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text[],
  boolean,
  boolean
) to authenticated;
