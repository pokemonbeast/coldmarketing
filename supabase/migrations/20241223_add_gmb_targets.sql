-- Add GMB targets column to businesses table
-- This stores an array of GMB lead finder targets with industry and location data

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS gmb_targets jsonb DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN businesses.gmb_targets IS 'Array of GMB Lead Finder targets: [{industry, country, countryName, state, stateCode, city}]';

