-- School Google Workspace accounts used to gate survey submission.

CREATE TABLE IF NOT EXISTS google_user (
  google_sub text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  picture text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE student
  ADD COLUMN IF NOT EXISTS google_sub text UNIQUE REFERENCES google_user (google_sub),
  ADD COLUMN IF NOT EXISTS email text;
