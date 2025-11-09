-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum for user roles
create type public.app_role as enum ('student', 'company', 'campus', 'admin');

-- Create enum for project status
create type public.project_status as enum ('draft', 'open', 'in_progress', 'completed', 'cancelled');

-- Create enum for application status
create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

-- Create enum for transaction type
create type public.transaction_type as enum ('credit', 'debit', 'commission', 'withdrawal');

-- 1. Profiles table (synced with Firebase UID)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text unique not null,
  email text not null,
  full_name text,
  avatar_url text,
  company_name text,
  company_website text,
  company_linkedin text,
  university_name text,
  skills text[],
  bio text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- 2. User roles table (separate for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 3. Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  category text,
  required_skills text[],
  budget_min decimal,
  budget_max decimal,
  pricing_type text, -- 'lump_sum' or 'retainer'
  start_date date,
  end_date date,
  status project_status default 'draft',
  blueprint_url text,
  milestones jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.projects enable row level security;

-- 4. Project applications table
create table public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  status application_status default 'pending',
  cover_letter text,
  proposed_budget decimal,
  applied_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (project_id, student_id)
);

alter table public.project_applications enable row level security;

-- 5. Wallets table
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  balance decimal default 0 not null check (balance >= 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.wallets enable row level security;

-- 6. Transactions table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  amount decimal not null,
  type transaction_type not null,
  description text,
  project_id uuid references public.projects(id),
  created_at timestamp with time zone default now()
);

alter table public.transactions enable row level security;

-- 7. Certificates table
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text unique not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  company_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  project_title text not null,
  issue_date date default current_date,
  duration text,
  qr_code_url text,
  pdf_url text,
  created_at timestamp with time zone default now()
);

alter table public.certificates enable row level security;

-- 8. Batches table (for campus)
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  department text,
  start_date date,
  end_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.batches enable row level security;

-- 9. Batch students table
create table public.batch_students (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.batches(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default now(),
  unique (batch_id, student_id)
);

alter table public.batch_students enable row level security;

-- 10. Messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id),
  content text not null,
  attachment_url text,
  read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create function to get user by firebase UID
create or replace function public.get_user_id_by_firebase_uid(_firebase_uid text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where firebase_uid = _firebase_uid
$$;

-- RLS Policies for profiles
create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (firebase_uid = current_setting('app.firebase_uid', true));

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (firebase_uid = current_setting('app.firebase_uid', true));

-- RLS Policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  using (user_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)), 'admin'));

-- RLS Policies for projects
create policy "Anyone can view open projects"
  on public.projects for select
  using (status = 'open' or company_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

create policy "Companies can create projects"
  on public.projects for insert
  with check (company_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

create policy "Companies can update own projects"
  on public.projects for update
  using (company_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

-- RLS Policies for project_applications
create policy "Users can view applications for their projects or their own applications"
  on public.project_applications for select
  using (
    student_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true))
    or exists (
      select 1 from public.projects
      where projects.id = project_applications.project_id
      and projects.company_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true))
    )
  );

create policy "Students can create applications"
  on public.project_applications for insert
  with check (student_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

create policy "Students can update own applications"
  on public.project_applications for update
  using (student_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

-- RLS Policies for wallets
create policy "Users can view own wallet"
  on public.wallets for select
  using (user_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

create policy "Users can insert own wallet"
  on public.wallets for insert
  with check (user_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

-- RLS Policies for transactions
create policy "Users can view own transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.wallets
      where wallets.id = transactions.wallet_id
      and wallets.user_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true))
    )
  );

-- RLS Policies for certificates
create policy "Anyone can view certificates"
  on public.certificates for select
  using (true);

create policy "Companies can issue certificates"
  on public.certificates for insert
  with check (company_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

-- RLS Policies for batches
create policy "Campus can view own batches"
  on public.batches for select
  using (campus_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

create policy "Campus can create batches"
  on public.batches for insert
  with check (campus_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

create policy "Campus can update own batches"
  on public.batches for update
  using (campus_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

-- RLS Policies for messages
create policy "Users can view their messages"
  on public.messages for select
  using (
    sender_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true))
    or receiver_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true))
  );

create policy "Users can send messages"
  on public.messages for insert
  with check (sender_id = public.get_user_id_by_firebase_uid(current_setting('app.firebase_uid', true)));

-- Create updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add triggers for updated_at
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_projects_updated_at before update on public.projects
  for each row execute function public.update_updated_at_column();

create trigger update_wallets_updated_at before update on public.wallets
  for each row execute function public.update_updated_at_column();

create trigger update_batches_updated_at before update on public.batches
  for each row execute function public.update_updated_at_column();