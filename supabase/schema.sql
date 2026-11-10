create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 2 and 120),
  sender_email text not null check (char_length(sender_email) between 3 and 320),
  message text not null check (char_length(message) between 10 and 10000),
  created_at timestamptz not null default now()
);

alter table public.inbox_messages enable row level security;

revoke all on table public.inbox_messages from anon, authenticated;
grant select on table public.inbox_messages to authenticated;
grant all on table public.inbox_messages to service_role;

drop policy if exists "Owner can read inbox messages" on public.inbox_messages;
create policy "Owner can read inbox messages"
  on public.inbox_messages
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'pruthvigowdakp5@gmail.com');

create table if not exists public.portal_pin_attempts (
  ip_hash text primary key check (char_length(ip_hash) = 64),
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);

alter table public.portal_pin_attempts enable row level security;
revoke all on table public.portal_pin_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.portal_pin_attempts to service_role;

create or replace function public.portal_pin_is_blocked(p_ip_hash text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    (select blocked_until > now()
     from public.portal_pin_attempts
     where ip_hash = p_ip_hash),
    false
  );
$$;

create or replace function public.portal_pin_record_failure(
  p_ip_hash text,
  p_max_attempts integer
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.portal_pin_attempts (ip_hash, attempts, window_started_at)
  values (p_ip_hash, 1, now())
  on conflict (ip_hash) do update
  set attempts = case
        when portal_pin_attempts.window_started_at <= now() - interval '15 minutes'
          then 1
        else portal_pin_attempts.attempts + 1
      end,
      window_started_at = case
        when portal_pin_attempts.window_started_at <= now() - interval '15 minutes'
          then now()
        else portal_pin_attempts.window_started_at
      end,
      blocked_until = case
        when portal_pin_attempts.window_started_at <= now() - interval '15 minutes'
          then null
        when portal_pin_attempts.attempts + 1 >= p_max_attempts
          then now() + interval '15 minutes'
        else portal_pin_attempts.blocked_until
      end;
$$;

create or replace function public.portal_pin_reset_attempts(p_ip_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.portal_pin_attempts where ip_hash = p_ip_hash;
$$;

revoke all on function public.portal_pin_is_blocked(text) from public, anon, authenticated;
revoke all on function public.portal_pin_record_failure(text, integer) from public, anon, authenticated;
revoke all on function public.portal_pin_reset_attempts(text) from public, anon, authenticated;
grant execute on function public.portal_pin_is_blocked(text) to service_role;
grant execute on function public.portal_pin_record_failure(text, integer) to service_role;
grant execute on function public.portal_pin_reset_attempts(text) to service_role;
