-- QRious: Aurora PostgreSQL schema (Neon 운영 DB의 현재 구조를 그대로 옮김)
--
-- 사용법: Workbench에서 대상 DB에 접속한 뒤 전체를 한 번에 실행합니다. (DDL만 포함, 데이터 없음)
-- 이관 순서: 이 파일 → 데이터 이관(참조 테이블 → student → registration → 나머지)
--
-- Neon 대비 달라진 점
--   * admin.admin_id 기본값: uuidv4()(PG18 전용) → gen_random_uuid()(PG13+ 내장, 동일 동작)
--   * student_id 10자리 CHECK: Neon은 NOT VALID, 여기서는 검증된 제약으로 생성
--     (현재 student 97행 전부 10자리라 이관 시 위반 없음)
--   * pgcrypto 확장은 만들지 않음 (앱·SQL 어디서도 사용하지 않음)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. 독립 테이블 (참조 데이터 / 설정)
-- ---------------------------------------------------------------------------

CREATE TABLE admin (
  admin_id   uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  phone      text,
  name       text,
  birth      text,
  CONSTRAINT admin_pkey PRIMARY KEY (admin_id),
  CONSTRAINT admin_birth_format CHECK (birth IS NULL OR birth ~ '^\d{6}$')
);

CREATE UNIQUE INDEX admin_name_phone_birth_uidx
  ON admin (lower(btrim(name)), regexp_replace(phone, '[^0-9]', '', 'g'), birth)
  WHERE name IS NOT NULL AND name <> ''
    AND phone IS NOT NULL AND phone <> ''
    AND birth IS NOT NULL AND birth <> '';

CREATE UNIQUE INDEX admin_phone_uidx
  ON admin (regexp_replace(phone, '[^0-9]', '', 'g'))
  WHERE phone IS NOT NULL AND phone <> '';

CREATE TABLE age_pref (
  age_pref_id text    NOT NULL,
  name        text    NOT NULL,
  sort_order  integer NOT NULL,
  CONSTRAINT age_pref_pkey PRIMARY KEY (age_pref_id),
  CONSTRAINT age_pref_name_key UNIQUE (name)
);

CREATE TABLE charm (
  charm_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name     text,
  CONSTRAINT charm_pkey PRIMARY KEY (charm_id)
);

CREATE TABLE major (
  major_id   text NOT NULL,
  name       text NOT NULL,
  short_name text NOT NULL,
  CONSTRAINT major_pkey PRIMARY KEY (major_id),
  CONSTRAINT major_name_key UNIQUE (name),
  CONSTRAINT major_short_name_key UNIQUE (short_name)
);

CREATE TABLE consent_notice (
  version          text        NOT NULL,
  title            text        NOT NULL,
  body             text        NOT NULL,
  purpose          text        NOT NULL,
  collected_items  text        NOT NULL,
  optional_items   text        NOT NULL,
  retention_period text        NOT NULL,
  refusal_notice   text        NOT NULL,
  body_hash        text        NOT NULL,
  published_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_notice_pkey PRIMARY KEY (version)
);

CREATE TABLE event_schedule (
  id              smallint    NOT NULL DEFAULT 1,
  round1_close    timestamptz NOT NULL,
  round1_announce timestamptz NOT NULL,
  round2_open     timestamptz NOT NULL,
  round2_close    timestamptz NOT NULL,
  round2_announce timestamptz NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_schedule_pkey PRIMARY KEY (id),
  CONSTRAINT event_schedule_id_check CHECK (id = 1)
);

-- ---------------------------------------------------------------------------
-- 2. 참가자 (student = 사람, registration = 차수별 접수)
-- ---------------------------------------------------------------------------

CREATE TABLE student (
  student_id text NOT NULL,           -- 10자리 학번
  name       text NOT NULL,
  phone      text NOT NULL,
  gender     boolean,                 -- false = 남자, true = 여자
  major_id   text,
  birth      text,                    -- YYMMDD
  CONSTRAINT student_pkey PRIMARY KEY (student_id),
  CONSTRAINT student_birth_format CHECK (birth IS NULL OR birth ~ '^\d{6}$'),
  CONSTRAINT student_id_student_number CHECK (student_id ~ '^\d{10}$'),
  CONSTRAINT student_major_id_fkey1
    FOREIGN KEY (major_id) REFERENCES major (major_id)
);

CREATE INDEX idx_student_major_id ON student (major_id);

CREATE UNIQUE INDEX student_name_phone_uidx
  ON student (lower(btrim(name)), regexp_replace(phone, '[^0-9]', '', 'g'));

CREATE TABLE registration (
  registration_id text     NOT NULL,
  student_id      text     NOT NULL,
  round           smallint NOT NULL DEFAULT 1,
  mbti            text,
  CONSTRAINT registration_pkey PRIMARY KEY (registration_id),
  CONSTRAINT registration_round_check CHECK (round = ANY (ARRAY[1, 2])),
  CONSTRAINT registration_student_id_round_key UNIQUE (student_id, round),
  CONSTRAINT registration_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES student (student_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_registration_round      ON registration (round);
CREATE INDEX idx_registration_student_id ON registration (student_id);

-- ---------------------------------------------------------------------------
-- 3. 접수에 딸린 테이블
-- ---------------------------------------------------------------------------

CREATE TABLE consent (
  consent_id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  registration_id       text        NOT NULL,   -- 증빙 보존용: registration FK 없음 (원본과 동일)
  notice_version        text        NOT NULL,
  agreed                boolean     NOT NULL,
  consented_at          timestamptz NOT NULL DEFAULT now(),
  consent_text_snapshot text        NOT NULL,
  consent_hash          text        NOT NULL,
  ip_address            text,
  user_agent            text,
  CONSTRAINT consent_pkey PRIMARY KEY (consent_id),
  CONSTRAINT consent_registration_id_notice_version_key
    UNIQUE (registration_id, notice_version),
  CONSTRAINT consent_notice_version_fkey
    FOREIGN KEY (notice_version) REFERENCES consent_notice (version)
);

CREATE INDEX idx_consent_consented_at   ON consent (consented_at);
CREATE INDEX idx_consent_registration_id ON consent (registration_id);

CREATE TABLE ex_have (
  registration_id text NOT NULL,
  charm           text,
  CONSTRAINT ex_have_pkey PRIMARY KEY (registration_id),
  CONSTRAINT ex_have_registration_id_fkey
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE
);

CREATE TABLE ex_want (
  registration_id text NOT NULL,
  charm           text,
  CONSTRAINT ex_want_pkey PRIMARY KEY (registration_id),
  CONSTRAINT ex_want_registration_id_fkey
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE
);

CREATE TABLE have (
  registration_id text NOT NULL,
  charm_id        uuid NOT NULL,
  CONSTRAINT have_pkey PRIMARY KEY (registration_id, charm_id),
  CONSTRAINT have_registration_id_fkey
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE,
  CONSTRAINT have_charm_id_fkey
    FOREIGN KEY (charm_id) REFERENCES charm (charm_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_have_charm_id ON have (charm_id);

CREATE TABLE want (
  registration_id text NOT NULL,
  charm_id        uuid NOT NULL,
  CONSTRAINT want_pkey PRIMARY KEY (registration_id, charm_id),
  CONSTRAINT want_registration_id_fkey
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE,
  CONSTRAINT want_charm_id_fkey
    FOREIGN KEY (charm_id) REFERENCES charm (charm_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_want_charm_id ON want (charm_id);

CREATE TABLE prefer_age (
  registration_id text NOT NULL,
  age_pref_id     text NOT NULL,
  CONSTRAINT prefer_age_pkey PRIMARY KEY (registration_id, age_pref_id),
  CONSTRAINT prefer_age_registration_id_fkey
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE,
  CONSTRAINT prefer_age_age_pref_id_fkey
    FOREIGN KEY (age_pref_id) REFERENCES age_pref (age_pref_id)
);

CREATE INDEX idx_prefer_age_age_pref_id ON prefer_age (age_pref_id);

-- ---------------------------------------------------------------------------
-- 4. 매칭 결과 / 문자 발송 로그
-- ---------------------------------------------------------------------------

CREATE TABLE match_result (
  round       smallint         NOT NULL DEFAULT 1,
  rank        integer          NOT NULL,
  male_id     text             NOT NULL,   -- registration.registration_id
  female_id   text             NOT NULL,   -- registration.registration_id
  mbti_score  double precision NOT NULL,
  tag_score   double precision NOT NULL,
  ex_score    double precision NOT NULL,
  final_score double precision NOT NULL,
  created_at  timestamptz      NOT NULL DEFAULT now(),
  ex_detail   jsonb,
  CONSTRAINT match_result_pkey PRIMARY KEY (round, rank),
  CONSTRAINT match_result_round_check CHECK (round = ANY (ARRAY[1, 2])),
  CONSTRAINT match_result_male_unique   UNIQUE (male_id),
  CONSTRAINT match_result_female_unique UNIQUE (female_id),
  CONSTRAINT match_result_male_registration_fkey
    FOREIGN KEY (male_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE,
  CONSTRAINT match_result_female_registration_fkey
    FOREIGN KEY (female_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_match_result_round        ON match_result (round);
CREATE INDEX match_result_final_score_idx  ON match_result (final_score DESC);

CREATE TABLE match_message (
  message_id      uuid        NOT NULL DEFAULT gen_random_uuid(),
  round           smallint    NOT NULL,
  rank            integer     NOT NULL,
  registration_id text        NOT NULL,
  role            text        NOT NULL,
  receiver_phone  text        NOT NULL,
  sender_phone    text        NOT NULL,
  message_body    text        NOT NULL,
  success         boolean     NOT NULL,
  http_status     integer,
  api_code        text,
  api_response    text,
  error_text      text,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  msg_group_id    text,
  msg_type        text,
  block_cnt       text,
  fail_cnt        text,
  success_cnt     text,
  test_yn         text,
  CONSTRAINT match_message_pkey PRIMARY KEY (message_id),
  CONSTRAINT match_message_role_check CHECK (role = ANY (ARRAY['male', 'female'])),
  CONSTRAINT match_message_registration_id_fkey
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE,
  CONSTRAINT match_message_result_fkey
    FOREIGN KEY (round, rank) REFERENCES match_result (round, rank)
    ON DELETE CASCADE
);

CREATE INDEX idx_match_message_registration ON match_message (registration_id);
CREATE INDEX idx_match_message_result       ON match_message (round, rank);
CREATE INDEX idx_match_message_success      ON match_message (round, registration_id, success);

COMMIT;

-- ---------------------------------------------------------------------------
-- (선택) 계정 권한: 라이터/리더 유저 이름에 맞게 수정해서 실행하세요.
-- ---------------------------------------------------------------------------
-- GRANT USAGE ON SCHEMA public TO qrious_writer, qrious_reader;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qrious_writer;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO qrious_reader;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qrious_writer;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO qrious_reader;

-- ---------------------------------------------------------------------------
-- (선택) 생성 확인: 테이블 16개, 인덱스·제약이 Neon과 같은지 비교
-- ---------------------------------------------------------------------------
-- SELECT count(*) FROM information_schema.tables
--  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';          -- 16
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1, 2;
