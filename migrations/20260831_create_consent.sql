-- Consent evidence for PIPA Art. 15 collection/use agreement.
-- consent_notice: versioned notice text (what was shown).
-- consent: who agreed, when, and a snapshot/hash of that notice.
-- student_id is stored without ON DELETE CASCADE so evidence can outlive student rows.

CREATE TABLE IF NOT EXISTS consent_notice (
  version text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  purpose text NOT NULL,
  collected_items text NOT NULL,
  optional_items text NOT NULL,
  retention_period text NOT NULL,
  refusal_notice text NOT NULL,
  body_hash text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent (
  consent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  notice_version text NOT NULL REFERENCES consent_notice (version),
  agreed boolean NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  consent_text_snapshot text NOT NULL,
  consent_hash text NOT NULL,
  ip_address text,
  user_agent text,
  UNIQUE (student_id, notice_version)
);

CREATE INDEX IF NOT EXISTS idx_consent_student_id ON consent (student_id);
CREATE INDEX IF NOT EXISTS idx_consent_consented_at ON consent (consented_at);
