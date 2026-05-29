-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS
-- ============================================================
create table if not exists households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null,
  currency text not null default 'GBP',
  created_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  currency text not null default 'GBP',
  household_id uuid references households(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- HOUSEHOLD MEMBERS
-- ============================================================
create table if not exists household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('owner','partner','child','parent','advisor')),
  invited_email text,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ASSETS
-- ============================================================
create table if not exists assets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text not null check (category in ('bank_account','investment','pension','property','crypto','insurance','other')),
  value numeric(15,2) not null default 0,
  currency text not null default 'GBP',
  institution text,
  account_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- LIABILITIES
-- ============================================================
create table if not exists liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text not null check (category in ('mortgage','loan','credit_card','overdraft','other')),
  balance numeric(15,2) not null default 0,
  currency text not null default 'GBP',
  interest_rate numeric(5,2),
  monthly_payment numeric(10,2),
  institution text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RENEWALS
-- ============================================================
create table if not exists renewals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text not null default 'subscription',
  amount numeric(10,2) not null default 0,
  currency text not null default 'GBP',
  renewal_date date not null,
  provider text,
  auto_renews boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- GOALS
-- ============================================================
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  target_amount numeric(15,2) not null,
  current_amount numeric(15,2) not null default 0,
  currency text not null default 'GBP',
  target_date date,
  category text not null default 'savings',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  file_url text not null,
  file_size integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AGENT: EMPLOYMENT HISTORY
-- ============================================================
create table if not exists employment_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  employer_name text not null,
  employer_name_normalised text,
  role text,
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  pension_enrolled boolean,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AGENT: TRACING REQUESTS
-- ============================================================
create table if not exists tracing_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  employment_record_id uuid references employment_records(id),
  service_type text not null check (service_type in ('pension_tracer','bank_tracer','ns_i','abi','hmrc')),
  employer_name text,
  scheme_name text,
  confidence_score numeric(3,2),
  status text not null default 'pending_intake',
  submitted_at timestamptz,
  expected_response_by date,
  response_received_at timestamptz,
  idempotency_key text unique not null,
  reference_number text,
  generated_letter text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- AGENT: WORKFLOW STATE
-- ============================================================
create table if not exists agent_workflows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  phase text not null default 'intake' check (phase in ('intake','inference','approval','submission','monitoring','complete')),
  messages jsonb not null default '[]',
  probable_assets jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOG (append-only)
-- ============================================================
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  data_ref text,
  outcome text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table assets enable row level security;
alter table liabilities enable row level security;
alter table renewals enable row level security;
alter table goals enable row level security;
alter table documents enable row level security;
alter table employment_records enable row level security;
alter table tracing_requests enable row level security;
alter table agent_workflows enable row level security;
alter table audit_log enable row level security;

-- Profiles: own row only
create policy "profiles_own" on profiles for all using (auth.uid() = id);

-- Households: owner or member
create policy "households_access" on households for all
  using (owner_id = auth.uid() or id in (
    select household_id from household_members where user_id = auth.uid() and accepted = true
  ));

-- Household members: own household
create policy "household_members_access" on household_members for all
  using (household_id in (
    select id from households where owner_id = auth.uid()
    union
    select household_id from household_members where user_id = auth.uid() and accepted = true
  ));

-- Assets, liabilities, renewals, goals, documents: household-scoped
create policy "assets_household" on assets for all
  using (household_id in (
    select id from households where owner_id = auth.uid()
    union
    select household_id from household_members where user_id = auth.uid() and accepted = true
  ));

create policy "liabilities_household" on liabilities for all
  using (household_id in (
    select id from households where owner_id = auth.uid()
    union
    select household_id from household_members where user_id = auth.uid() and accepted = true
  ));

create policy "renewals_household" on renewals for all
  using (household_id in (
    select id from households where owner_id = auth.uid()
    union
    select household_id from household_members where user_id = auth.uid() and accepted = true
  ));

create policy "goals_household" on goals for all
  using (household_id in (
    select id from households where owner_id = auth.uid()
    union
    select household_id from household_members where user_id = auth.uid() and accepted = true
  ));

create policy "documents_household" on documents for all
  using (household_id in (
    select id from households where owner_id = auth.uid()
    union
    select household_id from household_members where user_id = auth.uid() and accepted = true
  ));

-- Agent tables: own user only
create policy "employment_own" on employment_records for all using (user_id = auth.uid());
create policy "tracing_own" on tracing_requests for all using (user_id = auth.uid());
create policy "workflows_own" on agent_workflows for all using (user_id = auth.uid());
create policy "audit_own" on audit_log for select using (user_id = auth.uid());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_household_id uuid;
begin
  insert into households (name, owner_id)
  values (coalesce(new.raw_user_meta_data->>'full_name', 'My') || '''s Vault', new.id)
  returning id into new_household_id;

  insert into profiles (id, email, full_name, household_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_household_id
  );

  insert into household_members (household_id, user_id, role, accepted)
  values (new_household_id, new.id, 'owner', true);

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
