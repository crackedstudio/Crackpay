-- KashLink on Arc mainnet. Source for the escrow address: KashLink
-- contracts/deployments.md (Arc Mainnet), retrieved 2026-10-08; same address as
-- testnet v4, bytecode checked on mainnet the same day.
--
-- Push only after the network-scoped store is deployed: code that looks an app
-- up by id alone fails once two rows share the id "kashlink".
insert into public.miniapps (id, name, tagline, publisher, category, url, network, contracts, token_approvals, enabled)
values (
  'kashlink',
  'KashLink',
  'Send USDC or EURC as a link.',
  'Cracked Studios',
  'finance',
  'https://arc.kashlink.live/',
  'arc-mainnet',
  '[{"address": "0x4d6c05Fe69ECCB3fDd882D4e915d77ff29159C62", "name": "KashLinkEscrow"}]'::jsonb,
  array['EURC'],
  true
);
