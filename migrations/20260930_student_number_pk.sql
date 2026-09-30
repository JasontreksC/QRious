-- student.student_id is the 10-digit student number (학번).
-- Existing UUID keys stay until that person logs in and the app rewrites the key.
-- ON UPDATE CASCADE lets registration follow that rewrite.

ALTER TABLE registration DROP CONSTRAINT IF EXISTS registration_student_id_fkey;

ALTER TABLE registration
  ADD CONSTRAINT registration_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES student (student_id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

ALTER TABLE student DROP CONSTRAINT IF EXISTS student_id_student_number;

ALTER TABLE student
  ADD CONSTRAINT student_id_student_number
  CHECK (student_id ~ '^\d{10}$') NOT VALID;
