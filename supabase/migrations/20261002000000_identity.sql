-- Identity backend: users, OTP challenges and rate limits.
-- Every table has row level security on and no policies, so only the service
-- role (the Next.js server) can read or write. Nothing here is client-readable.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  -- HMAC(pepper, E.164 number). The number itself is never stored.
  phone_lookup text not null unique,
  -- Random per-user salt; phone_hash = keccak256(salt ‖ phone_lookup) goes on-chain.
  phone_salt text not null,
  phone_hash text not null unique,
  smart_account text,
  handle text,
  status text not null default 'pending' check (status in ('pending', 'registered')),
  created_at timestamptz not null default now()
);

-- A pending user has only been issued an attestation. Handles and accounts are
-- reserved once the registration is seen on-chain, so abandoned sign-ups do not
-- squat on names.
create unique index users_registered_handle on public.users (handle) where status = 'registered';
create unique index users_registered_account on public.users (lower(smart_account)) where status = 'registered';

create table public.otp_challenges (
  id uuid primary key,
  phone_lookup text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_challenges_expires_at on public.otp_challenges (expires_at);

create table public.rate_limits (
  key text not null,
  hit_at timestamptz not null default now()
);
create index rate_limits_key_hit_at on public.rate_limits (key, hit_at);

alter table public.users enable row level security;
alter table public.otp_challenges enable row level security;
alter table public.rate_limits enable row level security;

-- Sliding-window rate limit. Records the hit and returns true when it is
-- allowed. The advisory lock makes concurrent hits on one key count correctly.
create function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_key));
  delete from rate_limits where key = p_key and hit_at < now() - make_interval(secs => p_window_seconds);
  select count(*) into recent from rate_limits where key = p_key;
  if recent >= p_max then
    return false;
  end if;
  insert into rate_limits (key) values (p_key);
  return true;
end;
$$;

-- Atomically adds one failed attempt and returns the new total.
create function public.otp_bump_attempts(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update otp_challenges set attempts = attempts + 1 where id = p_id returning attempts;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.otp_bump_attempts(uuid) from public, anon, authenticated;
