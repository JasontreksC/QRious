-- QRious: ex_item_score — 항목 쌍(기준 + 요구 구절 + 가진 구절) 단위 LLM 채점 캐시
--
-- 사용법: Workbench에서 대상 DB에 접속한 뒤 전체를 한 번에 실행합니다.
--   * 새 테이블만 만듭니다. 기존 접수 데이터는 건드리지 않습니다.
--   * 여러 번 실행해도 안전합니다.
--   * 이미 적용한 DB에 background 기준을 추가하려면 04_ex_background.sql을 실행합니다. (criterion 제약 갱신)
--   * 이 테이블을 채우는 코드: qr-match/score_functions/ex.py (main.py가 매칭 전에 미리 채점)
--
-- 규칙
--   * cache_key = sha256(criterion, requested_text, possessed_text, prompt_version, model).
--     같은 두 구절은 어느 쌍에서 나와도 같은 점수가 됩니다.
--   * 한 번 저장된 행은 바뀌지 않습니다. (INSERT ... ON CONFLICT DO NOTHING)
--   * 프롬프트·앵커·모델이 바뀌면 prompt_version / model이 달라져 새 행이 만들어집니다.
--   * label과 score는 3회 호출(불일치 시 5회)의 중앙값입니다. samples에 호출별 라벨·점수·이유가 남습니다.

BEGIN;

CREATE TABLE IF NOT EXISTS ex_item_score (
  cache_key      text          NOT NULL,
  criterion      text          NOT NULL,
  requested_text text          NOT NULL,
  possessed_text text          NOT NULL,
  label          text          NOT NULL,
  score          numeric(3, 2) NOT NULL,
  samples        jsonb         NOT NULL,      -- 호출별 {label, score, reason}
  spread         numeric(3, 2) NOT NULL,      -- max - min
  resampled      boolean       NOT NULL DEFAULT false,
  model          text          NOT NULL,
  prompt_version text          NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT ex_item_score_pkey PRIMARY KEY (cache_key),
  CONSTRAINT ex_item_score_criterion_check CHECK (criterion IN (
    'impression', 'appearance', 'personality', 'vibe_style',
    'interests', 'relationship_values', 'lifestyle', 'background'
  )),
  CONSTRAINT ex_item_score_label_check CHECK (label IN (
    '동일', '거의 일치', '부분 일치', '약한 관련', '무관/충돌'
  )),
  CONSTRAINT ex_item_score_score_check CHECK (score IN (0, 0.25, 0.5, 0.75, 1)),
  CONSTRAINT ex_item_score_spread_check CHECK (spread >= 0 AND spread <= 1)
);

-- 매칭 실행이 현재 모델·프롬프트 버전의 행만 한꺼번에 읽습니다.
CREATE INDEX IF NOT EXISTS idx_ex_item_score_model_version
  ON ex_item_score (model, prompt_version);

COMMIT;

-- ---------------------------------------------------------------------------
-- (선택) 불안정했던 항목 보기: 재샘플 뒤에도 spread가 0.5 이상
-- ---------------------------------------------------------------------------
-- SELECT criterion, requested_text, possessed_text, label, spread, samples
--   FROM ex_item_score WHERE spread >= 0.5 ORDER BY created_at DESC;
