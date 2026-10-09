-- Mainnet and testnet CrackPay share this database. A Mini App's id is unique
-- per network, so one app (KashLink) can have a listing on each, pointing at
-- that network's site and contracts. Each deployment reads only its own network.
alter table public.miniapps drop constraint miniapps_pkey;
alter table public.miniapps add primary key (id, network);
