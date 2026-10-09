-- Step 1b: the per-network keys, added beside the old global ones. Code from
-- before and after the users-per-network change both work while both exist:
-- the old code upserts on phone_lookup, the new on (phone_lookup, network).
alter table public.users add constraint users_phone_lookup_network_key unique (phone_lookup, network);
alter table public.users add constraint users_phone_hash_network_key unique (phone_hash, network);
