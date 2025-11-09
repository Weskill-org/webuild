-- Create a trigger to automatically create a profile row when a new auth.user is created.
-- Run this in Supabase SQL editor (Project -> SQL).

-- Function to create profile for new auth users
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Insert a basic profile row for the user. Customize fields as needed.
  insert into public.profiles (id, full_name, role, created_at)
  values (new.id, new.raw_user_meta->> 'full_name', 'student', now())
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger on auth.users to call the function after insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- Notes:
-- 1) This runs with elevated privileges (security definer) and avoids client-side inserts being blocked by RLS.
-- 2) Adjust the inserted default role and fields as desired.
-- 3) Ensure the `profiles` table exists before running this.
