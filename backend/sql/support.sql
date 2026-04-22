create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "users can insert own tickets"
  on public.support_tickets for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "service role full access"
  on public.support_tickets for all
  to service_role using (true);
