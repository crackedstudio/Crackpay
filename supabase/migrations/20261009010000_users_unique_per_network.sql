-- Step 2 of 2: a handle, an account, a phone number and a phone hash are each
-- unique within one network, not across both. Testnet's @eagle no longer blocks
-- mainnet's.
--
-- Push only after the code that filters users by network is deployed: the code
-- before it upserts on phone_lookup alone, which needs the old constraint. The
-- per-network keys replacing it were added in 20261009005000.
alter table public.users drop constraint users_phone_lookup_key;
alter table public.users drop constraint users_phone_hash_key;

drop index public.users_registered_handle;
drop index public.users_registered_account;
create unique index users_registered_handle on public.users (network, handle) where status = 'registered';
create unique index users_registered_account on public.users (network, lower(smart_account)) where status = 'registered';
