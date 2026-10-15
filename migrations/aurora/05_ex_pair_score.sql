-- QRious: ex_pair_score — 원문 쌍(이상형 원문 + 매력 원문) 단위 ex 평가 캐시
--
-- 사용법: Workbench에서 대상 DB에 접속한 뒤 전체를 한 번에 실행합니다.
--   * 새 테이블만 만듭니다. 기존 접수 데이터와 ex_trait / ex_item_score는 건드리지 않습니다.
--   * 여러 번 실행해도 안전합니다.
--   * 이 테이블을 채우는 코드: qr-match/score_functions/ex.py (main.py가 매칭 전에 미리 평가)
--   * 이 테이블을 쓰면서 ex_trait 추출(extract_ex_traits.py)과 ex_item_score는 매칭에 쓰이지 않습니다.
--
-- 규칙
--   * cache_key = sha256(want_text, have_text, prompt_version, model).
--     같은 두 원문은 어느 쌍에서 나와도 같은 평가가 됩니다. 매력 원문을 적지 않았으면 have_text = ''.
--   * 한 번 저장된 행은 바뀌지 않습니다. (INSERT ... ON CONFLICT DO NOTHING)
--   * 프롬프트·기준·앵커·모델이 바뀌면 prompt_version / model이 달라져 새 행이 만들어집니다.
--   * criteria는 8개 기준별 합의 결과입니다. 3회 호출(의견이 갈리면 5회)에서 요구 여부는 과반으로,
--     라벨은 요구가 있다고 본 호출들의 점수 중앙값으로 정합니다. samples에 호출별 인용·이유·라벨이 남습니다.

BEGIN;

CREATE TABLE IF NOT EXISTS ex_pair_score (
  cache_key      text        NOT NULL,
  want_text      text        NOT NULL,
  have_text      text        NOT NULL,
  criteria       jsonb       NOT NULL,      -- 기준 -> {label, score, want_quote, have_quote, reason, votes, spread}
  samples        jsonb       NOT NULL,      -- 호출별 {기준 -> {label, want_quote, have_quote, reason}}
  resampled      boolean     NOT NULL DEFAULT false,
  model          text        NOT NULL,
  prompt_version text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ex_pair_score_pkey PRIMARY KEY (cache_key),
  CONSTRAINT ex_pair_score_criteria_check CHECK (jsonb_typeof(criteria) = 'object'),
  CONSTRAINT ex_pair_score_samples_check CHECK (jsonb_typeof(samples) = 'array' AND jsonb_array_length(samples) >= 1)
);

-- 매칭 실행이 현재 모델·프롬프트 버전의 행만 한꺼번에 읽습니다.
CREATE INDEX IF NOT EXISTS idx_ex_pair_score_model_version
  ON ex_pair_score (model, prompt_version);

COMMIT;

-- ---------------------------------------------------------------------------
-- (선택) 재샘플 뒤에도 의견이 크게 갈렸던 평가 보기
-- ---------------------------------------------------------------------------
-- SELECT want_text, have_text, key AS criterion, value
--   FROM ex_pair_score, jsonb_each(criteria)
--  WHERE resampled AND (value->>'spread')::numeric >= 0.5
--  ORDER BY created_at DESC;
