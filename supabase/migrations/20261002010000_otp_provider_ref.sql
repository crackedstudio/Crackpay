-- A challenge is checked either against a code hash CrackPay made itself, or by
-- a hosted verification service identified by provider_ref.
alter table public.otp_challenges alter column code_hash drop not null;
alter table public.otp_challenges add column provider_ref text;
alter table public.otp_challenges
  add constraint otp_challenges_one_verifier check ((code_hash is null) <> (provider_ref is null));
