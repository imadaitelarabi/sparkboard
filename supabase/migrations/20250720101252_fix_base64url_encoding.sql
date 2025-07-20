-- Fix base64url encoding issue by changing to base64 (PostgreSQL compatible)
-- This migration handles both scenarios:
-- 1. Production: Tables don't exist yet, will be created with correct encoding
-- 2. Local: Tables already exist, will update the default values

-- For board_shares table
DO $$
BEGIN
  -- Check if table exists and update default if it does
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'board_shares') THEN
    -- Update the default value for share_token column
    ALTER TABLE board_shares ALTER COLUMN share_token SET DEFAULT encode(gen_random_bytes(32), 'base64');
  END IF;
END $$;

-- For invitations table
DO $$
BEGIN
  -- Check if table exists and update default if it does
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    -- Update the default value for token column
    ALTER TABLE invitations ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(32), 'base64');
  END IF;
END $$;