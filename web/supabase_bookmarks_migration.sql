-- Comms Thread Bookmarks

-- 1) Table for per-user bookmarks
CREATE TABLE IF NOT EXISTS comms_thread_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comms_threads(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Uniqueness + indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comms_thread_bookmarks_unique') THEN
    ALTER TABLE comms_thread_bookmarks
    ADD CONSTRAINT comms_thread_bookmarks_unique UNIQUE (thread_id, profile_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comms_thread_bookmarks_profile_id
  ON comms_thread_bookmarks(profile_id);

CREATE INDEX IF NOT EXISTS idx_comms_thread_bookmarks_thread_id
  ON comms_thread_bookmarks(thread_id);

-- 3) RLS policies (user can only access own bookmarks)
ALTER TABLE comms_thread_bookmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comms_thread_bookmarks'
      AND policyname = 'bookmarks_select_own'
  ) THEN
    CREATE POLICY bookmarks_select_own
      ON comms_thread_bookmarks
      FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comms_thread_bookmarks'
      AND policyname = 'bookmarks_insert_own'
  ) THEN
    CREATE POLICY bookmarks_insert_own
      ON comms_thread_bookmarks
      FOR INSERT
      WITH CHECK (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comms_thread_bookmarks'
      AND policyname = 'bookmarks_delete_own'
  ) THEN
    CREATE POLICY bookmarks_delete_own
      ON comms_thread_bookmarks
      FOR DELETE
      USING (auth.uid() = profile_id);
  END IF;
END $$;

-- 4) Toggle helper function (same pattern as likes RPCs)
CREATE OR REPLACE FUNCTION handle_thread_bookmark(
  p_thread_id UUID,
  p_profile_id UUID,
  p_intended_to_bookmark BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  IF p_intended_to_bookmark THEN
    INSERT INTO comms_thread_bookmarks (thread_id, profile_id)
    VALUES (p_thread_id, p_profile_id)
    ON CONFLICT (thread_id, profile_id) DO NOTHING;
  ELSE
    DELETE FROM comms_thread_bookmarks
    WHERE thread_id = p_thread_id
      AND profile_id = p_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
