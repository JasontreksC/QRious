-- Fixed master of preferred age conditions, plus student references.
-- A student may reference only 'any' (상관없음), or any combination of
-- younger / same / older. Mixing 'any' with the others is not allowed.

CREATE TABLE IF NOT EXISTS age_pref (
  age_pref_id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL
);

INSERT INTO age_pref (age_pref_id, name, sort_order) VALUES
  ('any', '상관없음', 0),
  ('younger', '연하', 1),
  ('same', '동갑', 2),
  ('older', '연상', 3)
ON CONFLICT (age_pref_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS prefer_age (
  student_id text NOT NULL REFERENCES student (student_id) ON DELETE CASCADE,
  age_pref_id text NOT NULL REFERENCES age_pref (age_pref_id),
  PRIMARY KEY (student_id, age_pref_id)
);

CREATE INDEX IF NOT EXISTS idx_prefer_age_age_pref_id ON prefer_age (age_pref_id);
