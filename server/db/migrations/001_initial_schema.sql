-- MainStreet initial schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('seller', 'buyer')),
  full_name VARCHAR(255),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  years_in_operation INTEGER NOT NULL,
  location VARCHAR(255) NOT NULL,
  revenue_range VARCHAR(20) NOT NULL,
  employee_count INTEGER NOT NULL,
  retirement_timeline VARCHAR(10) NOT NULL,
  reason_for_selling TEXT NOT NULL,
  has_successor BOOLEAN NOT NULL DEFAULT FALSE,
  q_personal_relationships INTEGER NOT NULL DEFAULT 3,
  q_documented_procedures INTEGER NOT NULL DEFAULT 1,
  q_runs_without_owner INTEGER NOT NULL DEFAULT 1,
  q_management_team INTEGER NOT NULL DEFAULT 1,
  q_clean_financials INTEGER NOT NULL DEFAULT 1,
  preferred_buyer_type VARCHAR(20) NOT NULL,
  mentorship_willing BOOLEAN NOT NULL DEFAULT FALSE,
  roadmap_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  background_type VARCHAR(20) NOT NULL,
  location VARCHAR(255) NOT NULL,
  experience_summary TEXT NOT NULL,
  capital_range VARCHAR(20) NOT NULL,
  sba_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  credit_score_range VARCHAR(20) NOT NULL,
  business_experience VARCHAR(20) NOT NULL,
  preferred_industries TEXT NOT NULL DEFAULT '[]',
  preferred_size VARCHAR(20),
  willing_to_relocate BOOLEAN NOT NULL DEFAULT FALSE,
  wants_mentor BOOLEAN NOT NULL DEFAULT TRUE,
  motivation TEXT NOT NULL,
  checklist_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initiated_by VARCHAR(10) NOT NULL CHECK (initiated_by IN ('buyer', 'seller')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connections_buyer ON connections(buyer_id);
CREATE INDEX IF NOT EXISTS idx_connections_seller ON connections(seller_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_industry ON seller_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_buyers_background ON buyer_profiles(background_type);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
