-- Create profiles table linked to auth.users
create table profiles (
  id uuid references auth.users on delete cascade,
  full_name text,
  role text check (role in ('company', 'student', 'campus')),
  university text,
  company_name text,
  website text,
  logo_url text,
  created_at timestamp default now(),
  primary key (id)
);

-- Enable row level security and policies
alter table profiles enable row level security;

-- Allow anyone to select profiles (adjust as needed)
create policy "Profiles are viewable by everyone" on profiles
  for select using (true);

-- Allow authenticated users to insert their own profile (id must match auth.uid())
create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- Allow authenticated users to update their own profile
create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- NOTE: Create a storage bucket named 'avatars' in the Supabase Storage UI and make it public
-- or use signed URLs. To create a public bucket via SQL/API you can use the CLI or Admin API.
-- After creating the bucket, you may want to set a lifecycle or access rules depending on your needs.

-- Example: to make objects publicly accessible, either create the bucket as public in the UI
-- or use the Storage API to configure ACLs. For most apps, a public 'avatars' bucket is fine for user profile pictures.
