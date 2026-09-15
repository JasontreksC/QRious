-- Birth (YYMMDD) is person identity, not a survey field. Drop stored age.
-- Admin allowlist is name + phone + birth.

ALTER TABLE student ADD COLUMN IF NOT EXISTS birth text;

UPDATE student
SET birth = to_char(make_date(
  EXTRACT(YEAR FROM CURRENT_DATE)::int - age,
  1,
  1
), 'YYMMDD')
WHERE birth IS NULL AND age IS NOT NULL;

ALTER TABLE student DROP COLUMN IF EXISTS age;

ALTER TABLE student DROP CONSTRAINT IF EXISTS student_birth_format;
ALTER TABLE student
  ADD CONSTRAINT student_birth_format
  CHECK (birth IS NULL OR birth ~ '^\d{6}$');

ALTER TABLE admin ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS birth text;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS admin_id uuid DEFAULT gen_random_uuid();

UPDATE admin
SET admin_id = gen_random_uuid()
WHERE admin_id IS NULL;

ALTER TABLE admin ALTER COLUMN admin_id SET DEFAULT gen_random_uuid();
ALTER TABLE admin ALTER COLUMN admin_id SET NOT NULL;

ALTER TABLE admin DROP CONSTRAINT IF EXISTS admin_pkey;
ALTER TABLE admin ALTER COLUMN email DROP NOT NULL;
ALTER TABLE admin ADD PRIMARY KEY (admin_id);

ALTER TABLE admin DROP CONSTRAINT IF EXISTS admin_birth_format;
ALTER TABLE admin
  ADD CONSTRAINT admin_birth_format
  CHECK (birth IS NULL OR birth ~ '^\d{6}$');

CREATE UNIQUE INDEX IF NOT EXISTS admin_name_phone_birth_uidx
  ON admin (
    lower(btrim(name)),
    regexp_replace(phone, '[^0-9]', '', 'g'),
    birth
  )
  WHERE name IS NOT NULL AND name <> ''
    AND phone IS NOT NULL AND phone <> ''
    AND birth IS NOT NULL AND birth <> '';
