-- Create tables for Live Research feature
-- Tracks scraping runs and stores results with timed reveal for gradual display

-- Table: business_research_runs
-- Tracks each scraping run per business
CREATE TABLE IF NOT EXISTS business_research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('initial', 'weekly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  apify_run_id TEXT,
  apify_dataset_id TEXT,
  item_count INTEGER DEFAULT 0,
  keywords_used TEXT[] NOT NULL DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: research_results
-- Individual results with timed reveal for gradual display
CREATE TABLE IF NOT EXISTS research_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  research_run_id UUID NOT NULL REFERENCES business_research_runs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('reddit', 'gmb', 'twitter', 'linkedin')),
  result_data JSONB NOT NULL,
  reveal_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index-friendly columns extracted from result_data for querying
  external_id TEXT, -- Reddit post ID, etc.
  title TEXT,
  url TEXT,
  score INTEGER DEFAULT 0
);

-- Indexes for business_research_runs
CREATE INDEX IF NOT EXISTS idx_research_runs_business 
  ON business_research_runs(business_id);

CREATE INDEX IF NOT EXISTS idx_research_runs_user 
  ON business_research_runs(user_id);

CREATE INDEX IF NOT EXISTS idx_research_runs_status 
  ON business_research_runs(status);

CREATE INDEX IF NOT EXISTS idx_research_runs_created 
  ON business_research_runs(created_at DESC);

-- Indexes for research_results
CREATE INDEX IF NOT EXISTS idx_research_results_business 
  ON research_results(business_id);

CREATE INDEX IF NOT EXISTS idx_research_results_run 
  ON research_results(research_run_id);

CREATE INDEX IF NOT EXISTS idx_research_results_reveal 
  ON research_results(reveal_at);

CREATE INDEX IF NOT EXISTS idx_research_results_platform 
  ON research_results(platform);

-- Composite index for the main query pattern: revealed results for a business
CREATE INDEX IF NOT EXISTS idx_research_results_business_reveal 
  ON research_results(business_id, reveal_at DESC);

-- Unique constraint to prevent duplicate results
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_results_unique 
  ON research_results(business_id, platform, external_id) 
  WHERE external_id IS NOT NULL;

-- Enable RLS
ALTER TABLE business_research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_research_runs
-- Users can view their own research runs
CREATE POLICY "Users can view own research runs"
  ON business_research_runs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all research runs
CREATE POLICY "Admins can view all research runs"
  ON business_research_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- System/service role can insert research runs (for API routes)
CREATE POLICY "Service can insert research runs"
  ON business_research_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System/service role can update research runs
CREATE POLICY "Service can update research runs"
  ON business_research_runs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for research_results
-- Users can view their own revealed results (through business ownership)
CREATE POLICY "Users can view own revealed results"
  ON research_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = research_results.business_id 
      AND businesses.user_id = auth.uid()
    )
    AND reveal_at <= NOW()
  );

-- Admins can view all results (including unrevealed)
CREATE POLICY "Admins can view all results"
  ON research_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- System/service role can insert results
CREATE POLICY "Service can insert results"
  ON research_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE business_research_runs IS 'Tracks scraping runs for Live Research feature. Each run scrapes data for a business based on keywords.';
COMMENT ON TABLE research_results IS 'Individual research results with timed reveal. Results are revealed gradually over 1 week at 15-minute intervals.';
COMMENT ON COLUMN research_results.reveal_at IS 'Timestamp when this result becomes visible to the user. Used to create illusion of continuous research.';
COMMENT ON COLUMN research_results.result_data IS 'Full scraped data as JSONB (post title, content, author, subreddit, etc.)';

