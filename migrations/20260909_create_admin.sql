-- Allowlisted school Google emails that can open /admin without a password.

CREATE TABLE IF NOT EXISTS admin (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO admin (email)
VALUES ('jasontreks@yeonsung.ac.kr')
ON CONFLICT (email) DO NOTHING;
