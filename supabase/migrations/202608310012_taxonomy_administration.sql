-- Taxonomy administration is available to Admin and State Organizer roles only.
-- Routine staff may continue reading active taxonomy values, while taxonomy managers
-- can also see inactive values for reactivation and historical administration.

revoke insert, update, delete, truncate, references, trigger
  on table public.interests from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.tags from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.sources from authenticated;

grant select on table public.interests to authenticated, service_role;
grant select on table public.tags to authenticated, service_role;
grant select on table public.sources to authenticated, service_role;
grant insert, update, delete on table public.interests to service_role;
grant insert, update, delete on table public.tags to service_role;
grant insert, update, delete on table public.sources to service_role;

drop policy if exists interests_read on public.interests;
drop policy if exists tags_read on public.tags;
drop policy if exists sources_read on public.sources;
drop policy if exists tags_insert on public.tags;
drop policy if exists tags_update on public.tags;

create policy interests_read
on public.interests
for select to authenticated
using (
  private.is_active_staff()
  and (
    active
    or private.current_staff_role() in ('admin', 'state_organizer')
  )
);

create policy tags_read
on public.tags
for select to authenticated
using (
  private.is_active_staff()
  and (
    active
    or private.current_staff_role() in ('admin', 'state_organizer')
  )
);

create policy sources_read
on public.sources
for select to authenticated
using (
  private.is_active_staff()
  and (
    active
    or private.current_staff_role() in ('admin', 'state_organizer')
  )
);

create or replace function private.require_taxonomy_manager()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_role public.staff_role;
begin
  actor_id := private.current_staff_user_id();
  actor_role := private.current_staff_role();

  if actor_id is null or actor_role not in ('admin', 'state_organizer') then
    raise exception 'taxonomy management requires Admin or State Organizer access'
      using errcode = '42501';
  end if;

  return actor_id;
end;
$$;

revoke all on function private.require_taxonomy_manager() from public, anon, authenticated;

create or replace function public.manage_interest(
  p_interest_id uuid,
  p_name text,
  p_slug text,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  interest_id uuid;
  normalized_name text;
  normalized_slug text;
begin
  actor_id := private.require_taxonomy_manager();
  normalized_name := trim(p_name);
  normalized_slug := lower(trim(p_slug));

  if normalized_name is null or length(normalized_name) = 0 or length(normalized_name) > 120 then
    raise exception 'interest name must contain 1 to 120 characters'
      using errcode = '22023';
  end if;

  if p_active is null then
    raise exception 'interest active state is required'
      using errcode = '22023';
  end if;

  if p_interest_id is null then
    if normalized_slug is null
       or length(normalized_slug) = 0
       or length(normalized_slug) > 80
       or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'interest slug is invalid'
        using errcode = '22023';
    end if;

    insert into public.interests (slug, name, active)
    values (normalized_slug, normalized_name, p_active)
    returning id into interest_id;

    perform private.append_admin_audit(
      'taxonomy_created',
      'interest',
      interest_id,
      jsonb_build_object('taxonomy', 'interest', 'active', p_active)
    );
  else
    update public.interests
       set name = normalized_name,
           active = p_active
     where id = p_interest_id
     returning id into interest_id;

    if interest_id is null then
      raise exception 'interest not found'
        using errcode = '22023';
    end if;

    perform private.append_admin_audit(
      'taxonomy_updated',
      'interest',
      interest_id,
      jsonb_build_object('taxonomy', 'interest', 'active', p_active)
    );
  end if;

  return interest_id;
end;
$$;

create or replace function public.manage_tag(
  p_tag_id uuid,
  p_name text,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  tag_id uuid;
  normalized_name text;
begin
  actor_id := private.require_taxonomy_manager();
  normalized_name := trim(p_name);

  if normalized_name is null or length(normalized_name) = 0 or length(normalized_name) > 120 then
    raise exception 'tag name must contain 1 to 120 characters'
      using errcode = '22023';
  end if;

  if p_active is null then
    raise exception 'tag active state is required'
      using errcode = '22023';
  end if;

  if p_tag_id is null then
    insert into public.tags (name, active, created_by_staff_user_id)
    values (normalized_name, p_active, actor_id)
    returning id into tag_id;

    perform private.append_admin_audit(
      'taxonomy_created',
      'tag',
      tag_id,
      jsonb_build_object('taxonomy', 'tag', 'active', p_active)
    );
  else
    update public.tags
       set name = normalized_name,
           active = p_active
     where id = p_tag_id
     returning id into tag_id;

    if tag_id is null then
      raise exception 'tag not found'
        using errcode = '22023';
    end if;

    perform private.append_admin_audit(
      'taxonomy_updated',
      'tag',
      tag_id,
      jsonb_build_object('taxonomy', 'tag', 'active', p_active)
    );
  end if;

  return tag_id;
end;
$$;

create or replace function public.manage_source(
  p_source_id uuid,
  p_name text,
  p_slug text,
  p_category text,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  source_id uuid;
  normalized_name text;
  normalized_slug text;
  normalized_category text;
begin
  actor_id := private.require_taxonomy_manager();
  normalized_name := trim(p_name);
  normalized_slug := lower(trim(p_slug));
  normalized_category := lower(trim(p_category));

  if normalized_name is null or length(normalized_name) = 0 or length(normalized_name) > 120 then
    raise exception 'source name must contain 1 to 120 characters'
      using errcode = '22023';
  end if;

  if normalized_category is null
     or length(normalized_category) = 0
     or length(normalized_category) > 40
     or normalized_category !~ '^[a-z0-9]+([_-][a-z0-9]+)*$' then
    raise exception 'source category is invalid'
      using errcode = '22023';
  end if;

  if p_active is null then
    raise exception 'source active state is required'
      using errcode = '22023';
  end if;

  if p_source_id is null then
    if normalized_slug is null
       or length(normalized_slug) = 0
       or length(normalized_slug) > 80
       or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'source slug is invalid'
        using errcode = '22023';
    end if;

    insert into public.sources (slug, category, name, active)
    values (normalized_slug, normalized_category, normalized_name, p_active)
    returning id into source_id;

    perform private.append_admin_audit(
      'taxonomy_created',
      'source',
      source_id,
      jsonb_build_object(
        'taxonomy', 'source',
        'active', p_active,
        'category', normalized_category
      )
    );
  else
    update public.sources
       set name = normalized_name,
           category = normalized_category,
           active = p_active
     where id = p_source_id
     returning id into source_id;

    if source_id is null then
      raise exception 'source not found'
        using errcode = '22023';
    end if;

    perform private.append_admin_audit(
      'taxonomy_updated',
      'source',
      source_id,
      jsonb_build_object(
        'taxonomy', 'source',
        'active', p_active,
        'category', normalized_category
      )
    );
  end if;

  return source_id;
end;
$$;

revoke all on function public.manage_interest(uuid, text, text, boolean) from public, anon;
revoke all on function public.manage_tag(uuid, text, boolean) from public, anon;
revoke all on function public.manage_source(uuid, text, text, text, boolean) from public, anon;

grant execute on function public.manage_interest(uuid, text, text, boolean) to authenticated;
grant execute on function public.manage_tag(uuid, text, boolean) to authenticated;
grant execute on function public.manage_source(uuid, text, text, text, boolean) to authenticated;
