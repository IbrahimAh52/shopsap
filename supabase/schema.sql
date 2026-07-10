-- Create Enum Types
CREATE TYPE inspection_status AS ENUM ('AWAITING_INSPECTION', 'SENT', 'APPROVED', 'DECLINED');
CREATE TYPE urgency_level AS ENUM ('URGENT', 'RECOMMENDED', 'MONITOR');

-- Create Inspections Table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_year INT NOT NULL,
  vehicle_make VARCHAR(255) NOT NULL,
  vehicle_model VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  repair_name VARCHAR(255) NOT NULL,
  estimated_cost NUMERIC(10, 2) NOT NULL,
  urgency urgency_level NOT NULL DEFAULT 'RECOMMENDED',
  status inspection_status NOT NULL DEFAULT 'AWAITING_INSPECTION',
  video_url TEXT,
  signature TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable Realtime for inspections table
alter publication supabase_realtime add table inspections;
