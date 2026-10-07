-- QRious: ex_trait — 자유 텍스트(ex_want / ex_have)를 8개 기준으로 추출한 결과
--
-- 사용법: Workbench에서 대상 DB에 접속한 뒤 전체를 한 번에 실행합니다.
--   * 새 테이블만 만듭니다. 기존 접수 데이터(registration, ex_want, ex_have 등)는 건드리지 않습니다.
--   * 여러 번 실행해도 안전합니다. (이전 버전을 이미 적용했다면 lifestyle, background 컬럼과 제약만 보강합니다.)
--   * 이 테이블을 채우는 스크립트: qr-match/extract_ex_traits.py
--
-- 규칙
--   * (registration_id, side)당 한 행. side는 want(원하는 모습) 또는 have(본인이 가진 모습).
--   * 8개 기준 컬럼은 NULL이면 "없음". 빈 문자열은 허용하지 않습니다.
--   * 값은 원문에서 그대로 발췌한 구절입니다. 같은 기준이 여러 곳에 있으면 ' | '로 이어 붙입니다.
--   * source_text는 추출 시점의 원문 스냅샷입니다. 현재 원문과 다르면 재추출 대상입니다.
--   * 추출이 실패하면 extraction_ok = false, error_message 필수, 기준 컬럼은 모두 NULL.

BEGIN;

CREATE TABLE IF NOT EXISTS ex_trait (
  registration_id     text        NOT NULL,
  side                text        NOT NULL,
  impression          text,       -- 인상
  appearance          text,       -- 외모
  personality         text,       -- 성격/가치관
  vibe_style          text,       -- 분위기/스타일
  interests           text,       -- 취미/관심사
  relationship_values text,       -- 연애관
  lifestyle           text,       -- 생활습관
  background          text,       -- 배경(군필·직업·학력 등 사실 정보)
  extraction_ok       boolean     NOT NULL,
  source_text         text        NOT NULL,
  error_message       text,
  raw_response        jsonb,
  model               text        NOT NULL,
  prompt_version      text        NOT NULL,
  attempts            smallint    NOT NULL DEFAULT 1,
  extracted_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ex_trait_pkey PRIMARY KEY (registration_id, side),
  CONSTRAINT ex_trait_registration_id_fkey
    FOREIGN KEY (registration_id) REFERENCES registration (registration_id)
    ON DELETE CASCADE,
  CONSTRAINT ex_trait_side_check CHECK (side IN ('want', 'have')),
  CONSTRAINT ex_trait_attempts_check CHECK (attempts >= 1)
);

-- 이전 버전(6~7개 기준)을 이미 적용한 경우를 위한 보강
ALTER TABLE ex_trait ADD COLUMN IF NOT EXISTS lifestyle text;
ALTER TABLE ex_trait ADD COLUMN IF NOT EXISTS background text;

-- 기준 컬럼이 바뀌었으므로 컬럼 목록을 포함하는 두 제약은 지우고 다시 만듭니다.
ALTER TABLE ex_trait DROP CONSTRAINT IF EXISTS ex_trait_not_blank;
ALTER TABLE ex_trait
  ADD CONSTRAINT ex_trait_not_blank CHECK (
    (impression          IS NULL OR btrim(impression)          <> '') AND
    (appearance          IS NULL OR btrim(appearance)          <> '') AND
    (personality         IS NULL OR btrim(personality)         <> '') AND
    (vibe_style          IS NULL OR btrim(vibe_style)          <> '') AND
    (interests           IS NULL OR btrim(interests)           <> '') AND
    (relationship_values IS NULL OR btrim(relationship_values) <> '') AND
    (lifestyle           IS NULL OR btrim(lifestyle)           <> '') AND
    (background          IS NULL OR btrim(background)          <> '')
  );

ALTER TABLE ex_trait DROP CONSTRAINT IF EXISTS ex_trait_failed_check;
ALTER TABLE ex_trait
  ADD CONSTRAINT ex_trait_failed_check CHECK (
    extraction_ok OR (
      error_message IS NOT NULL AND
      impression          IS NULL AND
      appearance          IS NULL AND
      personality         IS NULL AND
      vibe_style          IS NULL AND
      interests           IS NULL AND
      relationship_values IS NULL AND
      lifestyle           IS NULL AND
      background          IS NULL
    )
  );

COMMIT;

-- ---------------------------------------------------------------------------
-- (선택) 확인
-- ---------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'ex_trait' ORDER BY ordinal_position;
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.ex_trait'::regclass ORDER BY 1;
