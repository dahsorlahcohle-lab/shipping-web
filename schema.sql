-- Create the shipments table in your Supabase SQL Editor
-- This table matches the structure required for the Paramount Maritime Operations tracker.

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id VARCHAR(255) UNIQUE NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    carrier_service TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast tracking code lookups
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_id ON shipments(tracking_id);

-- Enable RLS (Row Level Security) but allow all operations if bypassed by service role key
-- Or you can disable RLS completely for simple tracking apps:
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
