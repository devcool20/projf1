-- Seed: prediction_config rows for 2026 Grands Prix (rounds 1–14).
-- Mirrors web/src/lib/f1-calendar-2026.ts — keep qualifying_at in sync when you adjust the calendar in code.
--
-- Expected columns (rename if yours differ):
--   event_name    text
--   qualifying_at timestamptz  -- 1h-before-quali lock uses this in the app
--   lat           text         -- optional display
--   is_active     boolean
--
-- If your table requires `id` or `created_at` and has no defaults, add them explicitly, e.g.:
--   INSERT INTO prediction_config (id, event_name, qualifying_at, lat, is_active, created_at)
--   SELECT gen_random_uuid(), v.event_name, ...
--
-- Idempotent: skips event_name already present (case-insensitive). Safe to re-run.

INSERT INTO prediction_config (event_name, qualifying_at, lat, is_active)
SELECT v.event_name, v.qualifying_at, v.lat, v.is_active
FROM (
  VALUES
    ('Australian Grand Prix', '2026-03-14T05:00:00+00'::timestamptz, '37.8497° S', true),
    ('Chinese Grand Prix', '2026-03-21T07:00:00+00'::timestamptz, '31.3389° N', true),
    ('Japanese Grand Prix', '2026-03-28T06:00:00+00'::timestamptz, '34.8431° N', true),
    ('Bahrain Grand Prix', '2026-04-11T16:00:00+00'::timestamptz, '26.0325° N', true),
    ('Saudi Arabian Grand Prix', '2026-04-18T17:00:00+00'::timestamptz, '21.6311° N', true),
    ('Miami Grand Prix', '2026-05-02T20:00:00+00'::timestamptz, '25.9581° N', true),
    ('Canadian Grand Prix', '2026-05-23T20:00:00+00'::timestamptz, '45.5000° N', true),
    ('Monaco Grand Prix', '2026-05-30T14:00:00+00'::timestamptz, '43.7347° N', true),
    ('Spanish Grand Prix', '2026-06-13T14:00:00+00'::timestamptz, '41.5689° N', true),
    ('Austrian Grand Prix', '2026-06-27T12:00:00+00'::timestamptz, '47.2197° N', true),
    ('British Grand Prix', '2026-07-04T14:00:00+00'::timestamptz, '52.0733° N', true),
    ('Belgian Grand Prix', '2026-07-25T13:00:00+00'::timestamptz, '50.4372° N', true),
    ('Hungarian Grand Prix', '2026-08-01T14:00:00+00'::timestamptz, '47.5839° N', true),
    ('Dutch Grand Prix', '2026-08-29T12:00:00+00'::timestamptz, '52.3888° N', true)
) AS v(event_name, qualifying_at, lat, is_active)
WHERE NOT EXISTS (
  SELECT 1
  FROM prediction_config p
  WHERE lower(trim(p.event_name)) = lower(trim(v.event_name))
);
