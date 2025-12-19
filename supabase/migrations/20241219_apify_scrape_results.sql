-- Create table for storing Apify scrape results
-- All results from a single run are stored in one JSON column (results_data)
-- This avoids thousands of individual rows for each scraped place

CREATE TABLE IF NOT EXISTS apify_scrape_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES api_providers(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  input_config JSONB NOT NULL DEFAULT '{}',
  results_data JSONB NOT NULL DEFAULT '[]',
  item_count INTEGER NOT NULL DEFAULT 0,
  usage_usd DECIMAL(10, 6),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on run_id to prevent duplicates
  CONSTRAINT unique_run_id UNIQUE (run_id)
);

-- Index for querying by provider
CREATE INDEX IF NOT EXISTS idx_apify_scrape_results_provider 
  ON apify_scrape_results(provider_id);

-- Index for querying by actor
CREATE INDEX IF NOT EXISTS idx_apify_scrape_results_actor 
  ON apify_scrape_results(actor_id);

-- Index for querying by creation date
CREATE INDEX IF NOT EXISTS idx_apify_scrape_results_created 
  ON apify_scrape_results(created_at DESC);

-- Enable RLS
ALTER TABLE apify_scrape_results ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view scrape results
CREATE POLICY "Admins can view apify scrape results"
  ON apify_scrape_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert scrape results
CREATE POLICY "Admins can insert apify scrape results"
  ON apify_scrape_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete scrape results
CREATE POLICY "Admins can delete apify scrape results"
  ON apify_scrape_results
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Comment on table
COMMENT ON TABLE apify_scrape_results IS 'Stores results from Apify scraper runs. All items from a single run are stored in one JSONB column to optimize storage.';
COMMENT ON COLUMN apify_scrape_results.results_data IS 'Array of scraped items (e.g., Google Maps places) stored as JSONB';
COMMENT ON COLUMN apify_scrape_results.input_config IS 'The input configuration used for this scrape run';



