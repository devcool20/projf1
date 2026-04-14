-- SQL Migration: Enable Profile Picture Storage
-- This script ensures the 'avatar_url' column exists in the profiles table
-- and provides a helper for users to update their racing identity.

-- 1. Ensure the column exists (Supabase typically includes this, but for completeness)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'profiles' 
                   AND COLUMN_NAME = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 2. Add an index for performance if needed
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- 3. Example UPDATE query to link a new photo
-- UPDATE profiles 
-- SET avatar_url = 'https://your-storage-bucket.supabase.co/storage/v1/object/public/avatars/your-user-id.jpg'
-- WHERE id = 'your-user-id';

-- 4. Set default points if not set
ALTER TABLE profiles ALTER COLUMN points SET DEFAULT 1000;

-- 5. Comments on Essence
COMMENT ON COLUMN profiles.fav_team IS 'The Formula 1 team affiliation which drives the UI essence (e.g., Red Bull, Ferrari)';
