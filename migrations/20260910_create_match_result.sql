-- Pairwise matching output. One row per matched couple.
-- Rank is unique; each student appears in at most one pair.

CREATE TABLE IF NOT EXISTS match_result (
  rank integer PRIMARY KEY,
  male_id text NOT NULL UNIQUE REFERENCES student (student_id) ON DELETE CASCADE,
  female_id text NOT NULL UNIQUE REFERENCES student (student_id) ON DELETE CASCADE,
  mbti_score double precision NOT NULL,
  tag_score double precision NOT NULL,
  ex_score double precision NOT NULL,
  final_score double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_result_final_score_idx
  ON match_result (final_score DESC);
