-- Mainnet and testnet share this database (decided 2026-10-08), so every user
-- row says which network it belongs to. Step 1 of 2, safe for the code that is
-- live: it only adds and fills the column. Rows from before mainnet's first
-- sign-up (2026-10-08 15:02 UTC, from www.crackpay.xyz) are testnet.
alter table public.users
  add column network text not null default 'arc-testnet' check (network in ('arc-testnet', 'arc-mainnet'));

update public.users set network = 'arc-mainnet' where created_at >= '2026-10-08T15:00:00Z';
