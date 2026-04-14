-- Comms System Enhancements & Single Like Protection

-- 1. Function to handle thread likes (single like per account)
CREATE OR REPLACE FUNCTION handle_thread_like(p_thread_id UUID, p_profile_id UUID, p_intended_to_like BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF p_intended_to_like THEN
    -- Attempt to insert a like. If it already exists, do nothing.
    INSERT INTO comms_thread_likes (thread_id, profile_id)
    VALUES (p_thread_id, p_profile_id)
    ON CONFLICT (thread_id, profile_id) DO NOTHING;
  ELSE
    -- Delete the like.
    DELETE FROM comms_thread_likes
    WHERE thread_id = p_thread_id AND profile_id = p_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to handle reply likes (single like per account)
CREATE OR REPLACE FUNCTION handle_reply_like(p_reply_id UUID, p_profile_id UUID, p_intended_to_like BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF p_intended_to_like THEN
    INSERT INTO comms_reply_likes (reply_id, profile_id)
    VALUES (p_reply_id, p_profile_id)
    ON CONFLICT (reply_id, profile_id) DO NOTHING;
  ELSE
    DELETE FROM comms_reply_likes
    WHERE reply_id = p_reply_id AND profile_id = p_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure unique constraints exist for single like per user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comms_thread_likes_unique') THEN
        ALTER TABLE comms_thread_likes ADD CONSTRAINT comms_thread_likes_unique UNIQUE (thread_id, profile_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comms_reply_likes_unique') THEN
        ALTER TABLE comms_reply_likes ADD CONSTRAINT comms_reply_likes_unique UNIQUE (reply_id, profile_id);
    END IF;
END $$;

-- 4. Function to delete a thread and all its associations
CREATE OR REPLACE FUNCTION delete_comm_thread(p_thread_id UUID, p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM comms_threads WHERE id = p_thread_id AND profile_id = p_profile_id) THEN
    DELETE FROM comms_thread_likes WHERE thread_id = p_thread_id;
    
    DELETE FROM comms_reply_likes WHERE reply_id IN (SELECT id FROM comms_replies WHERE thread_id = p_thread_id);
    DELETE FROM comms_replies WHERE thread_id = p_thread_id;
    
    DELETE FROM comms_threads WHERE id = p_thread_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to delete a reply and its nested subtree
CREATE OR REPLACE FUNCTION delete_comm_reply(p_reply_id UUID, p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM comms_replies WHERE id = p_reply_id AND profile_id = p_profile_id) THEN
    DELETE FROM comms_reply_likes WHERE reply_id IN (
      WITH RECURSIVE reply_tree AS (
        SELECT id FROM comms_replies WHERE id = p_reply_id
        UNION ALL
        SELECT r.id FROM comms_replies r INNER JOIN reply_tree rt ON r.parent_id = rt.id
      )
      SELECT id FROM reply_tree
    );

    WITH RECURSIVE reply_tree AS (
      SELECT id FROM comms_replies WHERE id = p_reply_id
      UNION ALL
      SELECT r.id FROM comms_replies r INNER JOIN reply_tree rt ON r.parent_id = rt.id
    )
    DELETE FROM comms_replies WHERE id IN (SELECT id FROM reply_tree);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
