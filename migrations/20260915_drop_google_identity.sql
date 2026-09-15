-- Identify students by name + phone instead of school Google accounts.

ALTER TABLE student DROP CONSTRAINT IF EXISTS student_google_sub_fkey;
ALTER TABLE student DROP CONSTRAINT IF EXISTS student_google_sub_key;
ALTER TABLE student DROP COLUMN IF EXISTS google_sub;
ALTER TABLE student DROP COLUMN IF EXISTS email;
DROP TABLE IF EXISTS google_user;

CREATE UNIQUE INDEX IF NOT EXISTS student_name_phone_round_uidx
  ON student (
    round,
    lower(btrim(name)),
    regexp_replace(phone, '[^0-9]', '', 'g')
  );

ALTER TABLE admin ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS admin_phone_uidx
  ON admin (regexp_replace(phone, '[^0-9]', '', 'g'))
  WHERE phone IS NOT NULL AND phone <> '';
