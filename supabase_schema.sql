-- ====================================================================
-- PredictX Supabase Schema
-- Run this in your Supabase project: SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Datasets Table
CREATE TABLE IF NOT EXISTS public.datasets (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    row_count INTEGER DEFAULT 0,
    feature_count INTEGER DEFAULT 0,
    target_column TEXT,
    profile_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Analyses Table
CREATE TABLE IF NOT EXISTS public.analyses (
    id TEXT PRIMARY KEY,
    dataset_id TEXT REFERENCES public.datasets(id) ON DELETE SET NULL,
    dataset_name TEXT NOT NULL DEFAULT 'Dataset',
    target_column TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    progress INTEGER DEFAULT 0,
    current_stage TEXT DEFAULT 'Initialized',
    best_model_name TEXT DEFAULT 'N/A',
    summary_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);

-- 3. Indexes for fast lookup & dashboard queries
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_dataset_id ON public.analyses (dataset_id);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON public.datasets (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- 5. Access Policies (Allow read/insert/update for anon & service role)
DROP POLICY IF EXISTS "Allow public read access on datasets" ON public.datasets;
CREATE POLICY "Allow public read access on datasets"
    ON public.datasets FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert/update on datasets" ON public.datasets;
CREATE POLICY "Allow public insert/update on datasets"
    ON public.datasets FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on analyses" ON public.analyses;
CREATE POLICY "Allow public read access on analyses"
    ON public.analyses FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert/update on analyses" ON public.analyses;
CREATE POLICY "Allow public insert/update on analyses"
    ON public.analyses FOR ALL
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- Schema creation complete!
-- ====================================================================
