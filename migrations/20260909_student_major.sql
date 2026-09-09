-- Department for survey participants. Legacy rows may remain NULL.
ALTER TABLE student
  ADD COLUMN IF NOT EXISTS major text;
