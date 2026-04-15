-- Paddock Premieres (Screenings) booking system
-- Multi-seat per user, login required.

-- 1) Events table
CREATE TABLE IF NOT EXISTS screening_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  entry_fee INTEGER NOT NULL CHECK (entry_fee >= 0),
  venue TEXT NOT NULL,
  address TEXT NOT NULL,
  organiser TEXT NOT NULL,
  details TEXT NOT NULL,
  food_and_drinks TEXT[] NOT NULL DEFAULT '{}',
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  booked_seats INTEGER NOT NULL DEFAULT 0 CHECK (booked_seats >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (booked_seats <= total_seats)
);

CREATE INDEX IF NOT EXISTS idx_screening_events_starts_at
  ON screening_events(starts_at);

-- 1b) Extended operational metadata for screening experience
ALTER TABLE screening_events
  ADD COLUMN IF NOT EXISTS availability TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS food_timing TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS screening_timing TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS capacity_allocation JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS map_asset TEXT,
  ADD COLUMN IF NOT EXISTS house_rules TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_info TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'screening_events'
      AND column_name = 'seats_left'
  ) THEN
    ALTER TABLE screening_events
      ADD COLUMN seats_left INTEGER GENERATED ALWAYS AS (GREATEST(total_seats - booked_seats, 0)) STORED;
  END IF;
END $$;

-- 2) Bookings table
CREATE TABLE IF NOT EXISTS screening_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id TEXT NOT NULL REFERENCES screening_events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_count INTEGER NOT NULL CHECK (seat_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'screening_bookings_unique') THEN
    ALTER TABLE screening_bookings
      ADD CONSTRAINT screening_bookings_unique UNIQUE (screening_id, profile_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_screening_bookings_screening_id
  ON screening_bookings(screening_id);

CREATE INDEX IF NOT EXISTS idx_screening_bookings_profile_id
  ON screening_bookings(profile_id);

-- 3) updated_at helper trigger
CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_screening_events_set_updated_at ON screening_events;
CREATE TRIGGER trg_screening_events_set_updated_at
BEFORE UPDATE ON screening_events
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS trg_screening_bookings_set_updated_at ON screening_bookings;
CREATE TRIGGER trg_screening_bookings_set_updated_at
BEFORE UPDATE ON screening_bookings
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

-- 4) RLS
ALTER TABLE screening_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_events'
      AND policyname = 'screening_events_select_all'
  ) THEN
    CREATE POLICY screening_events_select_all
      ON screening_events
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_bookings'
      AND policyname = 'screening_bookings_select_own'
  ) THEN
    CREATE POLICY screening_bookings_select_own
      ON screening_bookings
      FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_bookings'
      AND policyname = 'screening_bookings_insert_own'
  ) THEN
    CREATE POLICY screening_bookings_insert_own
      ON screening_bookings
      FOR INSERT
      WITH CHECK (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_bookings'
      AND policyname = 'screening_bookings_update_own'
  ) THEN
    CREATE POLICY screening_bookings_update_own
      ON screening_bookings
      FOR UPDATE
      USING (auth.uid() = profile_id)
      WITH CHECK (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_bookings'
      AND policyname = 'screening_bookings_delete_own'
  ) THEN
    CREATE POLICY screening_bookings_delete_own
      ON screening_bookings
      FOR DELETE
      USING (auth.uid() = profile_id);
  END IF;
END $$;

-- 5) RPC: upsert booking quantity atomically while enforcing capacity.
CREATE OR REPLACE FUNCTION upsert_screening_booking(
  p_screening_id TEXT,
  p_seat_count INTEGER
)
RETURNS TABLE (
  screening_id TEXT,
  seat_count INTEGER,
  booked_seats INTEGER,
  seats_left INTEGER
) AS $$
DECLARE
  v_profile_id UUID;
  v_total_seats INTEGER;
  v_booked_seats INTEGER;
  v_existing_seat_count INTEGER;
  v_delta INTEGER;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_seat_count IS NULL OR p_seat_count < 1 THEN
    RAISE EXCEPTION 'seat_count must be at least 1';
  END IF;

  SELECT total_seats, booked_seats
  INTO v_total_seats, v_booked_seats
  FROM screening_events
  WHERE id = p_screening_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Screening not found';
  END IF;

  SELECT seat_count
  INTO v_existing_seat_count
  FROM screening_bookings
  WHERE screening_id = p_screening_id
    AND profile_id = v_profile_id
  FOR UPDATE;

  v_delta := p_seat_count - COALESCE(v_existing_seat_count, 0);

  IF (v_booked_seats + v_delta) > v_total_seats THEN
    RAISE EXCEPTION 'Not enough seats left';
  END IF;

  IF v_existing_seat_count IS NULL THEN
    INSERT INTO screening_bookings (screening_id, profile_id, seat_count)
    VALUES (p_screening_id, v_profile_id, p_seat_count);
  ELSE
    UPDATE screening_bookings
    SET seat_count = p_seat_count
    WHERE screening_id = p_screening_id
      AND profile_id = v_profile_id;
  END IF;

  UPDATE screening_events e
  SET booked_seats = e.booked_seats + v_delta
  WHERE e.id = p_screening_id;

  RETURN QUERY
  SELECT
    e.id,
    p_seat_count,
    e.booked_seats,
    e.total_seats - e.booked_seats
  FROM screening_events e
  WHERE e.id = p_screening_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6) RPC: cancel booking atomically and release seats.
CREATE OR REPLACE FUNCTION cancel_screening_booking(
  p_screening_id TEXT
)
RETURNS TABLE (
  screening_id TEXT,
  booked_seats INTEGER,
  seats_left INTEGER
) AS $$
DECLARE
  v_profile_id UUID;
  v_existing_seat_count INTEGER;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT seat_count
  INTO v_existing_seat_count
  FROM screening_bookings
  WHERE screening_id = p_screening_id
    AND profile_id = v_profile_id
  FOR UPDATE;

  IF v_existing_seat_count IS NULL THEN
    RAISE EXCEPTION 'No booking found for this user';
  END IF;

  DELETE FROM screening_bookings
  WHERE screening_id = p_screening_id
    AND profile_id = v_profile_id;

  UPDATE screening_events e
  SET booked_seats = GREATEST(e.booked_seats - v_existing_seat_count, 0)
  WHERE e.id = p_screening_id;

  RETURN QUERY
  SELECT
    e.id,
    e.booked_seats,
    e.total_seats - e.booked_seats
  FROM screening_events e
  WHERE e.id = p_screening_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION upsert_screening_booking(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_screening_booking(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_screening_booking(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_screening_booking(TEXT) TO authenticated;

-- 7) Venue-level booking model (one screening can have multiple venues)
CREATE TABLE IF NOT EXISTS screening_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id TEXT NOT NULL REFERENCES screening_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  booked_seats INTEGER NOT NULL DEFAULT 0 CHECK (booked_seats >= 0),
  entry_fee INTEGER NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  screen_size TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  screening_timing TEXT NOT NULL DEFAULT '',
  food_timing TEXT NOT NULL DEFAULT '',
  availability TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (booked_seats <= capacity)
);

CREATE INDEX IF NOT EXISTS idx_screening_venues_screening_id
  ON screening_venues(screening_id);

CREATE INDEX IF NOT EXISTS idx_screening_venues_active
  ON screening_venues(is_active);

ALTER TABLE screening_venues
  ADD COLUMN IF NOT EXISTS screen_size TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'screening_venues_unique_name_per_screening') THEN
    ALTER TABLE screening_venues
      ADD CONSTRAINT screening_venues_unique_name_per_screening UNIQUE (screening_id, name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'screening_venues'
      AND column_name = 'seats_left'
  ) THEN
    ALTER TABLE screening_venues
      ADD COLUMN seats_left INTEGER GENERATED ALWAYS AS (GREATEST(capacity - booked_seats, 0)) STORED;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_screening_venues_set_updated_at ON screening_venues;
CREATE TRIGGER trg_screening_venues_set_updated_at
BEFORE UPDATE ON screening_venues
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE IF NOT EXISTS screening_venue_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES screening_venues(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_count INTEGER NOT NULL CHECK (seat_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'screening_venue_bookings_unique') THEN
    ALTER TABLE screening_venue_bookings
      ADD CONSTRAINT screening_venue_bookings_unique UNIQUE (venue_id, profile_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_screening_venue_bookings_venue_id
  ON screening_venue_bookings(venue_id);

CREATE INDEX IF NOT EXISTS idx_screening_venue_bookings_profile_id
  ON screening_venue_bookings(profile_id);

DROP TRIGGER IF EXISTS trg_screening_venue_bookings_set_updated_at ON screening_venue_bookings;
CREATE TRIGGER trg_screening_venue_bookings_set_updated_at
BEFORE UPDATE ON screening_venue_bookings
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

ALTER TABLE screening_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_venue_bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_venues'
      AND policyname = 'screening_venues_select_all'
  ) THEN
    CREATE POLICY screening_venues_select_all
      ON screening_venues
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_venue_bookings'
      AND policyname = 'screening_venue_bookings_select_own'
  ) THEN
    CREATE POLICY screening_venue_bookings_select_own
      ON screening_venue_bookings
      FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_venue_bookings'
      AND policyname = 'screening_venue_bookings_insert_own'
  ) THEN
    CREATE POLICY screening_venue_bookings_insert_own
      ON screening_venue_bookings
      FOR INSERT
      WITH CHECK (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_venue_bookings'
      AND policyname = 'screening_venue_bookings_update_own'
  ) THEN
    CREATE POLICY screening_venue_bookings_update_own
      ON screening_venue_bookings
      FOR UPDATE
      USING (auth.uid() = profile_id)
      WITH CHECK (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screening_venue_bookings'
      AND policyname = 'screening_venue_bookings_delete_own'
  ) THEN
    CREATE POLICY screening_venue_bookings_delete_own
      ON screening_venue_bookings
      FOR DELETE
      USING (auth.uid() = profile_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION upsert_screening_venue_booking(
  p_venue_id UUID,
  p_seat_count INTEGER
)
RETURNS TABLE (
  venue_id UUID,
  seat_count INTEGER,
  booked_seats INTEGER,
  seats_left INTEGER,
  total_amount INTEGER
) AS $$
DECLARE
  v_profile_id UUID;
  v_capacity INTEGER;
  v_booked_seats INTEGER;
  v_existing_seat_count INTEGER;
  v_delta INTEGER;
  v_entry_fee INTEGER;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_seat_count IS NULL OR p_seat_count < 1 THEN
    RAISE EXCEPTION 'seat_count must be at least 1';
  END IF;

  SELECT capacity, booked_seats, entry_fee
  INTO v_capacity, v_booked_seats, v_entry_fee
  FROM screening_venues
  WHERE id = p_venue_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue not found';
  END IF;

  SELECT seat_count
  INTO v_existing_seat_count
  FROM screening_venue_bookings
  WHERE venue_id = p_venue_id
    AND profile_id = v_profile_id
  FOR UPDATE;

  v_delta := p_seat_count - COALESCE(v_existing_seat_count, 0);
  IF (v_booked_seats + v_delta) > v_capacity THEN
    RAISE EXCEPTION 'Not enough seats left';
  END IF;

  IF v_existing_seat_count IS NULL THEN
    INSERT INTO screening_venue_bookings (venue_id, profile_id, seat_count)
    VALUES (p_venue_id, v_profile_id, p_seat_count);
  ELSE
    UPDATE screening_venue_bookings
    SET seat_count = p_seat_count
    WHERE venue_id = p_venue_id
      AND profile_id = v_profile_id;
  END IF;

  UPDATE screening_venues v
  SET booked_seats = v.booked_seats + v_delta
  WHERE v.id = p_venue_id;

  RETURN QUERY
  SELECT
    v.id,
    p_seat_count,
    v.booked_seats,
    v.capacity - v.booked_seats,
    p_seat_count * v.entry_fee
  FROM screening_venues v
  WHERE v.id = p_venue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION cancel_screening_venue_booking(
  p_venue_id UUID
)
RETURNS TABLE (
  venue_id UUID,
  booked_seats INTEGER,
  seats_left INTEGER
) AS $$
DECLARE
  v_profile_id UUID;
  v_existing_seat_count INTEGER;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT seat_count
  INTO v_existing_seat_count
  FROM screening_venue_bookings
  WHERE venue_id = p_venue_id
    AND profile_id = v_profile_id
  FOR UPDATE;

  IF v_existing_seat_count IS NULL THEN
    RAISE EXCEPTION 'No booking found for this user';
  END IF;

  DELETE FROM screening_venue_bookings
  WHERE venue_id = p_venue_id
    AND profile_id = v_profile_id;

  UPDATE screening_venues v
  SET booked_seats = GREATEST(v.booked_seats - v_existing_seat_count, 0)
  WHERE v.id = p_venue_id;

  RETURN QUERY
  SELECT
    v.id,
    v.booked_seats,
    v.capacity - v.booked_seats
  FROM screening_venues v
  WHERE v.id = p_venue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION upsert_screening_venue_booking(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_screening_venue_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_screening_venue_booking(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_screening_venue_booking(UUID) TO authenticated;

-- 8) Seed data (rerunnable): Miami + Canadian GPs with 4 venues each.
-- Keep booked seats at 0 for manual self-testing.
INSERT INTO screening_events (
  id,
  title,
  city,
  starts_at,
  entry_fee,
  venue,
  address,
  organiser,
  details,
  food_and_drinks,
  total_seats,
  booked_seats,
  availability,
  food_timing,
  screening_timing,
  capacity_allocation,
  map_asset,
  house_rules,
  contact_info
)
VALUES
  (
    'miami-gp-screening-2026',
    'Miami GP Screening',
    'Miami',
    '2026-05-03T18:30:00Z',
    499,
    'Paddock Premieres',
    'Multi-city watch parties across India',
    'Paddock OS',
    'Live race screening with synchronized fan experiences.',
    ARRAY['Mocktails', 'Finger food', 'Popcorn'],
    800,
    0,
    ARRAY['Live race feed', 'Surround sound', 'Fan pit wall'],
    '17:45 IST onwards',
    '00:00 IST to race end',
    '{"Mumbai":200,"Pune":200,"Delhi":200,"Bangalore":200}'::jsonb,
    '/maps/2026trackmiamidetailed.avif',
    'Carry valid booking confirmation and photo ID.',
    'premieres@paddockos.com'
  ),
  (
    'canadian-gp-screening-2026',
    'Canadian GP Screening',
    'Montreal',
    '2026-06-14T18:30:00Z',
    499,
    'Paddock Premieres',
    'Multi-city watch parties across India',
    'Paddock OS',
    'The next featured GP screening after Miami.',
    ARRAY['Mocktails', 'Finger food', 'Popcorn'],
    800,
    0,
    ARRAY['Live race feed', 'Commentary zone', 'Fan pit wall'],
    '17:45 IST onwards',
    '00:00 IST to race end',
    '{"Mumbai":200,"Pune":200,"Delhi":200,"Bangalore":200}'::jsonb,
    '/maps/2026trackmontrealdetailed.avif',
    'Carry valid booking confirmation and photo ID.',
    'premieres@paddockos.com'
  )
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  city = EXCLUDED.city,
  starts_at = EXCLUDED.starts_at,
  entry_fee = EXCLUDED.entry_fee,
  venue = EXCLUDED.venue,
  address = EXCLUDED.address,
  organiser = EXCLUDED.organiser,
  details = EXCLUDED.details,
  food_and_drinks = EXCLUDED.food_and_drinks,
  total_seats = EXCLUDED.total_seats,
  booked_seats = EXCLUDED.booked_seats,
  availability = EXCLUDED.availability,
  food_timing = EXCLUDED.food_timing,
  screening_timing = EXCLUDED.screening_timing,
  capacity_allocation = EXCLUDED.capacity_allocation,
  map_asset = EXCLUDED.map_asset,
  house_rules = EXCLUDED.house_rules,
  contact_info = EXCLUDED.contact_info;

INSERT INTO screening_venues (
  screening_id,
  name,
  city,
  address,
  capacity,
  booked_seats,
  entry_fee,
  screen_size,
  photo_url,
  screening_timing,
  food_timing,
  availability,
  is_active
)
VALUES
  (
    'miami-gp-screening-2026',
    'Mumbai',
    'Mumbai',
    'PVR Maison, Jio World Drive, BKC, Mumbai',
    200,
    0,
    499,
    '4K LED, 52 ft',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    '00:00 IST to race end',
    '17:45 IST onwards',
    ARRAY['Premium seating', 'Race commentary', 'Merch pop-up'],
    true
  ),
  (
    'miami-gp-screening-2026',
    'Pune',
    'Pune',
    'Cinepolis Pavilion, Senapati Bapat Road, Pune',
    200,
    0,
    499,
    'Laser projection, 46 ft',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
    '00:00 IST to race end',
    '17:45 IST onwards',
    ARRAY['Food court access', 'Fan trivia', 'Live leaderboard'],
    true
  ),
  (
    'miami-gp-screening-2026',
    'Delhi',
    'Delhi',
    'PVR Directors Cut, Ambience Mall, Vasant Kunj, Delhi',
    200,
    0,
    499,
    'Dolby Atmos, 50 ft',
    'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=1200&q=80',
    '00:00 IST to race end',
    '17:45 IST onwards',
    ARRAY['Lounge seating', 'Energy drinks', 'Photo booth'],
    true
  ),
  (
    'miami-gp-screening-2026',
    'Bangalore',
    'Bangalore',
    'INOX Phoenix Mall of Asia, Hebbal, Bangalore',
    200,
    0,
    499,
    'IMAX digital, 58 ft',
    'https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=1200&q=80',
    '00:00 IST to race end',
    '17:45 IST onwards',
    ARRAY['Community tables', 'Theme snacks', 'Pit stop challenge'],
    true
  ),
  (
    'canadian-gp-screening-2026',
    'Mumbai',
    'Mumbai',
    'PVR Maison, Jio World Drive, BKC, Mumbai',
    200,
    0,
    499,
    '4K LED, 52 ft',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    '23:30 IST to race end',
    '22:30 IST onwards',
    ARRAY['Premium seating', 'Race commentary', 'Merch pop-up'],
    true
  ),
  (
    'canadian-gp-screening-2026',
    'Pune',
    'Pune',
    'Cinepolis Pavilion, Senapati Bapat Road, Pune',
    200,
    0,
    499,
    'Laser projection, 46 ft',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
    '23:30 IST to race end',
    '22:30 IST onwards',
    ARRAY['Food court access', 'Fan trivia', 'Live leaderboard'],
    true
  ),
  (
    'canadian-gp-screening-2026',
    'Delhi',
    'Delhi',
    'PVR Directors Cut, Ambience Mall, Vasant Kunj, Delhi',
    200,
    0,
    499,
    'Dolby Atmos, 50 ft',
    'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=1200&q=80',
    '23:30 IST to race end',
    '22:30 IST onwards',
    ARRAY['Lounge seating', 'Energy drinks', 'Photo booth'],
    true
  ),
  (
    'canadian-gp-screening-2026',
    'Bangalore',
    'Bangalore',
    'INOX Phoenix Mall of Asia, Hebbal, Bangalore',
    200,
    0,
    499,
    'IMAX digital, 58 ft',
    'https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=1200&q=80',
    '23:30 IST to race end',
    '22:30 IST onwards',
    ARRAY['Community tables', 'Theme snacks', 'Pit stop challenge'],
    true
  )
ON CONFLICT (screening_id, name) DO UPDATE
SET
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  capacity = EXCLUDED.capacity,
  booked_seats = EXCLUDED.booked_seats,
  entry_fee = EXCLUDED.entry_fee,
  screen_size = EXCLUDED.screen_size,
  photo_url = EXCLUDED.photo_url,
  screening_timing = EXCLUDED.screening_timing,
  food_timing = EXCLUDED.food_timing,
  availability = EXCLUDED.availability,
  is_active = EXCLUDED.is_active;
