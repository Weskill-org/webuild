-- Drop the existing check constraint on pricing_type if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pricing_type_check;

-- Add it back with the new values 'commission' and 'fixed_plus_commission'
ALTER TABLE projects ADD CONSTRAINT projects_pricing_type_check 
  CHECK (pricing_type IN ('fixed', 'hourly', 'milestone', 'commission', 'fixed_plus_commission'));
