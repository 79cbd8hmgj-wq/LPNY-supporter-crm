create or replace function public.search_people_directory(
  p_query text default null,
  p_county_id uuid default null,
  p_zip_code text default null,
  p_engagement_stage public.engagement_stage default null,
  p_relationship_slug text default null,
  p_interest_slug text default null,
  p_tag_id uuid default null,
  p_organizer_id uuid default null,
  p_source_slug text default null,
  p_joined_after timestamptz default null,
  p_joined_before_exclusive timestamptz default null,
  p_last_activity_before timestamptz default null,
  p_has_open_task boolean default null,
  p_candidate_interest boolean default null,
  p_member_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  zip_code text,
  county_id uuid,
  county_name text,
  municipality text,
  engagement_stage public.engagement_stage,
  assigned_staff_user_id uuid,
  do_not_contact boolean,
  last_activity_at timestamptz,
  created_at timestamptz,
  has_open_task boolean,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered_people as (
    select
      person.id,
      person.first_name,
      person.last_name,
      person.email,
      person.phone,
      person.zip_code,
      person.county_id,
      county.name as county_name,
      person.municipality,
      person.engagement_stage,
      person.assigned_staff_user_id,
      person.do_not_contact,
      person.last_activity_at,
      person.created_at,
      exists (
        select 1
        from public.tasks task
        where task.person_id = person.id
          and task.status = 'open'
      ) as has_open_task
    from public.people person
    left join public.counties county on county.id = person.county_id
    where person.archived_at is null
      and (
        nullif(trim(p_query), '') is null
        or strpos(
          lower(concat_ws(
            ' ',
            person.first_name,
            person.last_name,
            person.email,
            person.phone,
            person.zip_code,
            person.municipality
          )),
          lower(trim(p_query))
        ) > 0
      )
      and (p_county_id is null or person.county_id = p_county_id)
      and (p_zip_code is null or person.zip_code = p_zip_code)
      and (p_engagement_stage is null or person.engagement_stage = p_engagement_stage)
      and (p_organizer_id is null or person.assigned_staff_user_id = p_organizer_id)
      and (p_joined_after is null or person.created_at >= p_joined_after)
      and (p_joined_before_exclusive is null or person.created_at < p_joined_before_exclusive)
      and (
        p_last_activity_before is null
        or coalesce(person.last_activity_at, person.created_at) < p_last_activity_before
      )
      and (
        p_relationship_slug is null
        or exists (
          select 1
          from public.person_relationships person_relationship
          join public.relationship_types relationship_type
            on relationship_type.id = person_relationship.relationship_type_id
          where person_relationship.person_id = person.id
            and relationship_type.slug = p_relationship_slug
        )
      )
      and (
        p_interest_slug is null
        or exists (
          select 1
          from public.person_interests person_interest
          join public.interests interest on interest.id = person_interest.interest_id
          where person_interest.person_id = person.id
            and interest.slug = p_interest_slug
        )
      )
      and (
        p_tag_id is null
        or exists (
          select 1
          from public.person_tags person_tag
          where person_tag.person_id = person.id
            and person_tag.tag_id = p_tag_id
        )
      )
      and (
        p_source_slug is null
        or exists (
          select 1
          from public.person_sources person_source
          join public.sources source on source.id = person_source.source_id
          where person_source.person_id = person.id
            and source.slug = p_source_slug
        )
      )
      and (
        p_candidate_interest is null
        or p_candidate_interest = exists (
          select 1
          from public.person_relationships candidate_relationship
          join public.relationship_types candidate_type
            on candidate_type.id = candidate_relationship.relationship_type_id
          where candidate_relationship.person_id = person.id
            and candidate_type.slug = 'candidate-interest'
        )
      )
      and (
        p_member_status is null
        or (
          p_member_status = 'member'
          and exists (
            select 1
            from public.person_relationships member_relationship
            join public.relationship_types member_type
              on member_type.id = member_relationship.relationship_type_id
            where member_relationship.person_id = person.id
              and member_type.slug = 'member'
          )
        )
        or (
          p_member_status = 'former_member'
          and exists (
            select 1
            from public.person_relationships former_relationship
            join public.relationship_types former_type
              on former_type.id = former_relationship.relationship_type_id
            where former_relationship.person_id = person.id
              and former_type.slug = 'former-member'
          )
        )
        or (
          p_member_status = 'not_member'
          and not exists (
            select 1
            from public.person_relationships any_member_relationship
            join public.relationship_types any_member_type
              on any_member_type.id = any_member_relationship.relationship_type_id
            where any_member_relationship.person_id = person.id
              and any_member_type.slug in ('member', 'former-member')
          )
        )
      )
  )
  select
    filtered_people.id,
    filtered_people.first_name,
    filtered_people.last_name,
    filtered_people.email,
    filtered_people.phone,
    filtered_people.zip_code,
    filtered_people.county_id,
    filtered_people.county_name,
    filtered_people.municipality,
    filtered_people.engagement_stage,
    filtered_people.assigned_staff_user_id,
    filtered_people.do_not_contact,
    filtered_people.last_activity_at,
    filtered_people.created_at,
    filtered_people.has_open_task,
    count(*) over() as total_count
  from filtered_people
  where p_has_open_task is null or filtered_people.has_open_task = p_has_open_task
  order by
    coalesce(filtered_people.last_activity_at, filtered_people.created_at) desc,
    filtered_people.last_name asc,
    filtered_people.first_name asc,
    filtered_people.id asc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_people_directory(
  text, uuid, text, public.engagement_stage, text, text, uuid, uuid, text,
  timestamptz, timestamptz, timestamptz, boolean, boolean, text, integer, integer
) from public, anon;

grant execute on function public.search_people_directory(
  text, uuid, text, public.engagement_stage, text, text, uuid, uuid, text,
  timestamptz, timestamptz, timestamptz, boolean, boolean, text, integer, integer
) to authenticated;
