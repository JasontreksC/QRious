-- QRious: ex 기준에 background(배경: 군필·직업·학력 같은 사실 정보) 추가
--
-- 사용법: Workbench에서 대상 DB에 접속한 뒤 전체를 한 번에 실행합니다.
--   * 02_ex_trait.sql, 03_ex_item_score.sql을 이미 적용한 DB를 위한 변경입니다.
--   * 기존 접수 데이터(registration, ex_want, ex_have 등)는 건드리지 않습니다.
--   * 이미 쌓인 ex_trait / ex_item_score 행도 지우거나 바꾸지 않습니다.
--     background 컬럼은 기존 행에서 NULL(없음)입니다.
--   * 여러 번 실행해도 안전합니다. ex_item_score가 아직 없으면 그 부분만 건너뜁니다.
--   * 02, 03 파일도 같은 8개 기준으로 고쳐 두었으므로, 새 DB에는 02 → 03 → 04 순서로 모두 실행해도 됩니다.
--
-- 적용 뒤
--   * 프롬프트 버전이 바뀌므로 python extract_ex_traits.py --execute 를 다시 실행하면
--     기존 추출 결과(prompt_version이 다른 행)를 자동으로 다시 추출합니다. (--force 불필요)

BEGIN;

-- 1) ex_trait: background 컬럼 추가
ALTER TABLE ex_trait ADD COLUMN IF NOT EXISTS background text;   -- 배경(군필·직업·학력 등 사실 정보)

-- 2) 컬럼 목록을 포함하는 두 제약은 지우고 8개 기준으로 다시 만듭니다.
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

-- 3) ex_item_score: criterion 허용 값에 background 추가 (테이블이 있을 때만)
DO $$
BEGIN
  IF to_regclass('public.ex_item_score') IS NOT NULL THEN
    ALTER TABLE ex_item_score DROP CONSTRAINT IF EXISTS ex_item_score_criterion_check;
    ALTER TABLE ex_item_score
      ADD CONSTRAINT ex_item_score_criterion_check CHECK (criterion IN (
        'impression', 'appearance', 'personality', 'vibe_style',
        'interests', 'relationship_values', 'lifestyle', 'background'
      ));
  END IF;
END
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- (선택) 확인
-- ---------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'ex_trait' ORDER BY ordinal_position;
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid IN ('public.ex_trait'::regclass, 'public.ex_item_score'::regclass) AND contype = 'c' ORDER BY 1;
