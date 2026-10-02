-- Mini App listings submitted by developers for review. A person reviews each
-- row and adds approved apps to the registry in apps/web/src/config/miniapps.ts.
create table public.miniapp_submissions (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  listing jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  created_at timestamptz not null default now()
);
create index miniapp_submissions_status_created_at on public.miniapp_submissions (status, created_at desc);

-- No policies: only the service role (the Next.js server) can read or write.
alter table public.miniapp_submissions enable row level security;
