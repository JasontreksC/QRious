-- Split student (person + survey) into student (profile) and registration (per-round).
-- Existing student_id values become registration_id so match_result male_id/female_id stay valid.

ALTER TABLE student RENAME TO registration;

ALTER TABLE registration RENAME COLUMN student_id TO registration_id;
ALTER TABLE registration RENAME CONSTRAINT student_pkey TO registration_pkey;
ALTER TABLE registration RENAME CONSTRAINT student_round_check TO registration_round_check;
ALTER INDEX idx_student_round RENAME TO idx_registration_round;

ALTER TABLE have RENAME COLUMN student_id TO registration_id;
ALTER TABLE have RENAME CONSTRAINT have_student_id_fkey TO have_registration_id_fkey;

ALTER TABLE want RENAME COLUMN student_id TO registration_id;
ALTER TABLE want RENAME CONSTRAINT want_student_id_fkey TO want_registration_id_fkey;

ALTER TABLE prefer_age RENAME COLUMN student_id TO registration_id;
ALTER TABLE prefer_age RENAME CONSTRAINT prefer_age_student_id_fkey TO prefer_age_registration_id_fkey;

ALTER TABLE ex_have RENAME COLUMN student_id TO registration_id;
ALTER TABLE ex_have RENAME CONSTRAINT ex_have_student_id_fkey TO ex_have_registration_id_fkey;

ALTER TABLE ex_want RENAME COLUMN student_id TO registration_id;
ALTER TABLE ex_want RENAME CONSTRAINT ex_want_student_id_fkey TO ex_want_registration_id_fkey;

ALTER TABLE consent RENAME COLUMN student_id TO registration_id;
ALTER TABLE consent RENAME CONSTRAINT consent_student_id_notice_version_key
  TO consent_registration_id_notice_version_key;
ALTER INDEX idx_consent_student_id RENAME TO idx_consent_registration_id;

ALTER TABLE match_message RENAME COLUMN student_id TO registration_id;
ALTER TABLE match_message RENAME CONSTRAINT match_message_student_id_fkey
  TO match_message_registration_id_fkey;
ALTER INDEX idx_match_message_student RENAME TO idx_match_message_registration;

ALTER TABLE match_result RENAME CONSTRAINT match_result_male_id_fkey
  TO match_result_male_registration_fkey;
ALTER TABLE match_result RENAME CONSTRAINT match_result_female_id_fkey
  TO match_result_female_registration_fkey;

CREATE TABLE student (
  student_id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  gender boolean,
  age integer,
  major_id text REFERENCES major (major_id)
);

INSERT INTO student (student_id, name, phone, gender, age, major_id)
SELECT gen_random_uuid()::text, src.name, src.phone, src.gender, src.age, src.major_id
FROM (
  SELECT DISTINCT ON (
    lower(btrim(COALESCE(name, ''))),
    regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')
  )
    COALESCE(name, '') AS name,
    COALESCE(phone, '') AS phone,
    gender,
    age,
    major_id
  FROM registration
  ORDER BY
    lower(btrim(COALESCE(name, ''))),
    regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'),
    round DESC
) src;

ALTER TABLE registration ADD COLUMN student_id text;

UPDATE registration r
SET student_id = s.student_id
FROM student s
WHERE lower(btrim(COALESCE(r.name, ''))) = lower(btrim(s.name))
  AND regexp_replace(COALESCE(r.phone, ''), '[^0-9]', '', 'g')
    = regexp_replace(s.phone, '[^0-9]', '', 'g');

ALTER TABLE registration
  ALTER COLUMN student_id SET NOT NULL;

ALTER TABLE registration
  ADD CONSTRAINT registration_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE;

ALTER TABLE registration
  ADD CONSTRAINT registration_student_id_round_key UNIQUE (student_id, round);

DROP INDEX IF EXISTS student_name_phone_round_uidx;

ALTER TABLE registration
  DROP COLUMN name,
  DROP COLUMN phone,
  DROP COLUMN gender,
  DROP COLUMN age,
  DROP COLUMN major_id;

CREATE UNIQUE INDEX student_name_phone_uidx
  ON student (
    lower(btrim(name)),
    regexp_replace(phone, '[^0-9]', '', 'g')
  );

CREATE INDEX idx_student_major_id ON student (major_id);
CREATE INDEX idx_registration_student_id ON registration (student_id);
