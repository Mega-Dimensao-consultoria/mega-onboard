-- ============================================================
-- CONTRACTS
-- ============================================================
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'pending_setup' check (status in ('pending_setup','active','paused','cancelled')),
  accepted_at timestamptz,
  accepted_ip text,
  started_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_contracts_client on public.contracts(client_id);
create index idx_contracts_lead on public.contracts(lead_id);

alter table public.contracts enable row level security;

create policy "Client reads own contracts" on public.contracts
  for select to authenticated using (client_id = auth.uid() or has_role(auth.uid(),'consultor'));
create policy "Consultor inserts contracts" on public.contracts
  for insert to authenticated with check (has_role(auth.uid(),'consultor') or client_id = auth.uid());
create policy "Consultor updates contracts" on public.contracts
  for update to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Consultor deletes contracts" on public.contracts
  for delete to authenticated using (has_role(auth.uid(),'consultor'));

create trigger contracts_updated_at before update on public.contracts
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- CONTRACT ITEMS
-- ============================================================
create table public.contract_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  custom_name text,
  custom_price_cents integer,
  billing_cycle text not null check (billing_cycle in ('monthly','quarterly','yearly','one_time')),
  quantity integer not null default 1 check (quantity > 0),
  next_billing_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_contract_items_contract on public.contract_items(contract_id);
create index idx_contract_items_next_billing on public.contract_items(next_billing_at) where active = true;

alter table public.contract_items enable row level security;

create policy "Read contract items via contract" on public.contract_items
  for select to authenticated using (
    has_role(auth.uid(),'consultor') or
    exists (select 1 from public.contracts c where c.id = contract_items.contract_id and c.client_id = auth.uid())
  );
create policy "Consultor writes contract items" on public.contract_items
  for insert to authenticated with check (has_role(auth.uid(),'consultor'));
create policy "Consultor updates contract items" on public.contract_items
  for update to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Consultor deletes contract items" on public.contract_items
  for delete to authenticated using (has_role(auth.uid(),'consultor'));
-- Cliente pode contratar serviço a la carte (insere via app)
create policy "Client adds own service items" on public.contract_items
  for insert to authenticated with check (
    exists (select 1 from public.contracts c where c.id = contract_items.contract_id and c.client_id = auth.uid())
  );

create trigger contract_items_updated_at before update on public.contract_items
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- INVOICES
-- ============================================================
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  period_start date,
  period_end date,
  due_date date not null,
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  status text not null default 'open' check (status in ('open','paid','overdue','cancelled')),
  payment_method text check (payment_method in ('pix','paypal','manual')),
  paid_at timestamptz,
  payment_proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_status on public.invoices(status);
create index idx_invoices_due on public.invoices(due_date);

alter table public.invoices enable row level security;

create policy "Read own invoices" on public.invoices
  for select to authenticated using (client_id = auth.uid() or has_role(auth.uid(),'consultor'));
create policy "Consultor writes invoices" on public.invoices
  for insert to authenticated with check (has_role(auth.uid(),'consultor'));
create policy "Consultor or owner updates invoice" on public.invoices
  for update to authenticated using (
    has_role(auth.uid(),'consultor') or client_id = auth.uid()
  );
create policy "Consultor deletes invoices" on public.invoices
  for delete to authenticated using (has_role(auth.uid(),'consultor'));

create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  contract_item_id uuid references public.contract_items(id) on delete set null,
  description text not null,
  amount_cents integer not null default 0,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);
create index idx_invoice_items_invoice on public.invoice_items(invoice_id);

alter table public.invoice_items enable row level security;

create policy "Read invoice items via invoice" on public.invoice_items
  for select to authenticated using (
    has_role(auth.uid(),'consultor') or
    exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.client_id = auth.uid())
  );
create policy "Consultor writes invoice items" on public.invoice_items
  for insert to authenticated with check (has_role(auth.uid(),'consultor'));
create policy "Consultor updates invoice items" on public.invoice_items
  for update to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Consultor deletes invoice items" on public.invoice_items
  for delete to authenticated using (has_role(auth.uid(),'consultor'));

-- ============================================================
-- PAYMENT INTENTS
-- ============================================================
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  provider text not null check (provider in ('pix','paypal')),
  provider_ref text,
  qr_code text,
  copy_paste text,
  status text not null default 'pending' check (status in ('pending','submitted','confirmed','failed','expired')),
  expires_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payment_intents_invoice on public.payment_intents(invoice_id);

alter table public.payment_intents enable row level security;

create policy "Read intents via invoice" on public.payment_intents
  for select to authenticated using (
    has_role(auth.uid(),'consultor') or
    exists (select 1 from public.invoices i where i.id = payment_intents.invoice_id and i.client_id = auth.uid())
  );
create policy "Owner or consultor inserts intents" on public.payment_intents
  for insert to authenticated with check (
    has_role(auth.uid(),'consultor') or
    exists (select 1 from public.invoices i where i.id = payment_intents.invoice_id and i.client_id = auth.uid())
  );
create policy "Owner or consultor updates intents" on public.payment_intents
  for update to authenticated using (
    has_role(auth.uid(),'consultor') or
    exists (select 1 from public.invoices i where i.id = payment_intents.invoice_id and i.client_id = auth.uid())
  );
create policy "Consultor deletes intents" on public.payment_intents
  for delete to authenticated using (has_role(auth.uid(),'consultor'));

create trigger payment_intents_updated_at before update on public.payment_intents
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_actor on public.audit_log(actor_user_id);
create index idx_audit_target on public.audit_log(target_type, target_id);

alter table public.audit_log enable row level security;

create policy "Consultor reads audit log" on public.audit_log
  for select to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Authenticated inserts own audit" on public.audit_log
  for insert to authenticated with check (actor_user_id = auth.uid() or has_role(auth.uid(),'consultor'));

-- ============================================================
-- BRAND_SETTINGS extra columns (Pix + PayPal)
-- ============================================================
alter table public.brand_settings
  add column if not exists pix_key text,
  add column if not exists pix_key_type text check (pix_key_type in ('cpf','cnpj','email','phone','random')),
  add column if not exists paypal_username text;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('brand-assets','brand-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('briefings','briefings', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-proofs','payment-proofs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('contracts','contracts', false)
on conflict (id) do nothing;

-- brand-assets: public read, consultor write
create policy "brand-assets public read" on storage.objects
  for select using (bucket_id = 'brand-assets');
create policy "brand-assets consultor write" on storage.objects
  for insert to authenticated with check (bucket_id = 'brand-assets' and has_role(auth.uid(),'consultor'));
create policy "brand-assets consultor update" on storage.objects
  for update to authenticated using (bucket_id = 'brand-assets' and has_role(auth.uid(),'consultor'));
create policy "brand-assets consultor delete" on storage.objects
  for delete to authenticated using (bucket_id = 'brand-assets' and has_role(auth.uid(),'consultor'));

-- briefings: only consultor read/write (briefings refer to leads, not auth users)
create policy "briefings consultor read" on storage.objects
  for select to authenticated using (bucket_id = 'briefings' and has_role(auth.uid(),'consultor'));
create policy "briefings consultor write" on storage.objects
  for insert to authenticated with check (bucket_id = 'briefings' and has_role(auth.uid(),'consultor'));
create policy "briefings consultor update" on storage.objects
  for update to authenticated using (bucket_id = 'briefings' and has_role(auth.uid(),'consultor'));
create policy "briefings consultor delete" on storage.objects
  for delete to authenticated using (bucket_id = 'briefings' and has_role(auth.uid(),'consultor'));

-- payment-proofs: client uploads to their own folder (uid as first segment), consultor sees all
create policy "payment-proofs owner read" on storage.objects
  for select to authenticated using (
    bucket_id = 'payment-proofs' and (
      has_role(auth.uid(),'consultor') or auth.uid()::text = (storage.foldername(name))[1]
    )
  );
create policy "payment-proofs owner write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'payment-proofs' and (
      has_role(auth.uid(),'consultor') or auth.uid()::text = (storage.foldername(name))[1]
    )
  );
create policy "payment-proofs owner update" on storage.objects
  for update to authenticated using (
    bucket_id = 'payment-proofs' and (
      has_role(auth.uid(),'consultor') or auth.uid()::text = (storage.foldername(name))[1]
    )
  );
create policy "payment-proofs consultor delete" on storage.objects
  for delete to authenticated using (bucket_id = 'payment-proofs' and has_role(auth.uid(),'consultor'));

-- contracts (PDF): same pattern (uid prefix)
create policy "contracts owner read" on storage.objects
  for select to authenticated using (
    bucket_id = 'contracts' and (
      has_role(auth.uid(),'consultor') or auth.uid()::text = (storage.foldername(name))[1]
    )
  );
create policy "contracts consultor write" on storage.objects
  for insert to authenticated with check (bucket_id = 'contracts' and has_role(auth.uid(),'consultor'));
create policy "contracts consultor update" on storage.objects
  for update to authenticated using (bucket_id = 'contracts' and has_role(auth.uid(),'consultor'));
create policy "contracts consultor delete" on storage.objects
  for delete to authenticated using (bucket_id = 'contracts' and has_role(auth.uid(),'consultor'));

-- ============================================================
-- LEADS / LEAD_ANSWERS / FORM_QUESTIONS — consultor RLS
-- (originalmente lidos/escritos pela edge function antiga via service role)
-- ============================================================
create policy "Consultor reads leads" on public.leads
  for select to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Consultor updates leads" on public.leads
  for update to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Consultor deletes leads" on public.leads
  for delete to authenticated using (has_role(auth.uid(),'consultor'));

create policy "Consultor reads answers" on public.lead_answers
  for select to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Consultor deletes answers" on public.lead_answers
  for delete to authenticated using (has_role(auth.uid(),'consultor'));

create policy "Consultor inserts questions" on public.form_questions
  for insert to authenticated with check (has_role(auth.uid(),'consultor'));
create policy "Consultor updates questions" on public.form_questions
  for update to authenticated using (has_role(auth.uid(),'consultor'));
create policy "Consultor deletes questions" on public.form_questions
  for delete to authenticated using (has_role(auth.uid(),'consultor'));
