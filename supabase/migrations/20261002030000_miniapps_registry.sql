-- The Mini App registry, managed from /admin. An app listed here with
-- enabled = true is what users see on the Apps page; its url is the only site
-- /apps/<id> may frame, and its contracts are the only ones it may call.
create table public.miniapps (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,30}$' and id <> 'test'),
  name text not null,
  tagline text not null,
  publisher text not null,
  category text not null,
  url text not null check (url like 'https://%'),
  icon text check (icon is null or icon like 'https://%'),
  network text not null check (network in ('arc-testnet', 'arc-mainnet')),
  -- [{ "address": "0x…", "name": "…" }]
  contracts jsonb not null default '[]'::jsonb check (jsonb_typeof(contracts) = 'array'),
  token_approvals text[] not null default '{}' check (token_approvals <@ array['USDC', 'EURC']),
  enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No policies: only the service role (the Next.js server) can read or write.
alter table public.miniapps enable row level security;

-- KashLink, the first listed app. Source for the escrow address: KashLink
-- contracts/deployments.md, Arc Testnet v4, retrieved 2026-10-02.
insert into public.miniapps (id, name, tagline, publisher, category, url, network, contracts, token_approvals, enabled)
values (
  'kashlink',
  'KashLink',
  'Send USDC or EURC as a link.',
  'Cracked Studios',
  'finance',
  'https://arc.kashlink.live/',
  'arc-testnet',
  '[{"address": "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62", "name": "KashLinkEscrow"}]'::jsonb,
  array['EURC'],
  true
);
