-- MainStreet schema (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('seller', 'buyer')),
  full_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  years_in_operation INTEGER NOT NULL,
  location TEXT NOT NULL,
  revenue_range TEXT NOT NULL,           -- e.g. '<500k', '500k-1m', '1m-3m', '3m-10m', '10m+'
  employee_count INTEGER NOT NULL,

  retirement_timeline TEXT NOT NULL,     -- '1-2', '3-5', '5-10'
  reason_for_selling TEXT NOT NULL,
  has_successor INTEGER NOT NULL DEFAULT 0,

  -- quiz answers (1-5 or 0/1/2)
  q_personal_relationships INTEGER NOT NULL DEFAULT 3,
  q_documented_procedures INTEGER NOT NULL DEFAULT 1,  -- 0=No, 1=Partial, 2=Yes
  q_runs_without_owner INTEGER NOT NULL DEFAULT 1,
  q_management_team INTEGER NOT NULL DEFAULT 1,
  q_clean_financials INTEGER NOT NULL DEFAULT 1,

  preferred_buyer_type TEXT NOT NULL,   -- 'employee', 'veteran', 'immigrant', 'community', 'open'
  mentorship_willing INTEGER NOT NULL DEFAULT 0,

  roadmap_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  background_type TEXT NOT NULL,        -- 'veteran', 'immigrant', 'employee', 'first_gen', 'other'
  location TEXT NOT NULL,
  experience_summary TEXT NOT NULL,

  capital_range TEXT NOT NULL,          -- '<100k', '100k-250k', '250k-500k', '500k-1m', '1m+'
  sba_eligible INTEGER NOT NULL DEFAULT 0,
  credit_score_range TEXT NOT NULL,     -- '<600', '600-679', '680-739', '740+'
  business_experience TEXT NOT NULL,    -- 'none', 'employed', 'managed', 'owned'

  preferred_industries TEXT NOT NULL,   -- JSON array
  preferred_size TEXT NOT NULL,
  willing_to_relocate INTEGER NOT NULL DEFAULT 0,
  wants_mentor INTEGER NOT NULL DEFAULT 1,

  motivation TEXT NOT NULL,
  checklist_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('buyer', 'seller')),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(buyer_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_buyer ON connections(buyer_id);
CREATE INDEX IF NOT EXISTS idx_connections_seller ON connections(seller_id);
