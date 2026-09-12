-- Single-row festival timetable. Admins edit this from /admin/schedule.

CREATE TABLE IF NOT EXISTS event_schedule (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  round1_close timestamptz NOT NULL,
  round1_announce timestamptz NOT NULL,
  round2_open timestamptz NOT NULL,
  round2_close timestamptz NOT NULL,
  round2_announce timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO event_schedule (
  id,
  round1_close,
  round1_announce,
  round2_open,
  round2_close,
  round2_announce
) VALUES (
  1,
  '2026-10-15T00:00:00+09:00',
  '2026-10-15T12:00:00+09:00',
  '2026-10-15T12:00:00+09:00',
  '2026-10-16T00:00:00+09:00',
  '2026-10-16T12:00:00+09:00'
)
ON CONFLICT (id) DO NOTHING;
