-- Distinguish 1st / 2nd registration rounds. Existing rows are round 1.
-- The same Google account may register once per round.

ALTER TABLE student
  ADD COLUMN IF NOT EXISTS round smallint NOT NULL DEFAULT 1;

ALTER TABLE student
  DROP CONSTRAINT IF EXISTS student_round_check;

ALTER TABLE student
  ADD CONSTRAINT student_round_check CHECK (round IN (1, 2));

ALTER TABLE student
  DROP CONSTRAINT IF EXISTS student_google_sub_key;

ALTER TABLE student
  DROP CONSTRAINT IF EXISTS student_google_sub_round_key;

ALTER TABLE student
  ADD CONSTRAINT student_google_sub_round_key UNIQUE (google_sub, round);

CREATE INDEX IF NOT EXISTS idx_student_round ON student (round);

-- Keep 1차 / 2차 match rows side by side (rank is unique per round).
ALTER TABLE match_result
  ADD COLUMN IF NOT EXISTS round smallint NOT NULL DEFAULT 1;

ALTER TABLE match_result
  DROP CONSTRAINT IF EXISTS match_result_round_check;

ALTER TABLE match_result
  ADD CONSTRAINT match_result_round_check CHECK (round IN (1, 2));

ALTER TABLE match_result
  DROP CONSTRAINT IF EXISTS match_result_pkey;

ALTER TABLE match_result
  ADD CONSTRAINT match_result_pkey PRIMARY KEY (round, rank);

CREATE INDEX IF NOT EXISTS idx_match_result_round ON match_result (round);
