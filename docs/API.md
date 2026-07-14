# QRious Survey API Specification

백엔드가 구현해야 할 REST API 계약서입니다.  
ERD: `Student`, `Charm`, `Have`, `Want`, `ExHave`, `ExWant`.

브라우저는 백엔드 URL을 모릅니다. 같은 origin의 `/api/*`만 호출하고, Next.js 서버([`src/app/api/[...path]/route.ts`](../src/app/api/[...path]/route.ts))가 `API_BASE_URL`로 프록시합니다.

---

## Base URL

서버 전용 (브라우저에 노출되지 않음):

```
API_BASE_URL=http://localhost:8080
```

- trailing slash 없이 설정합니다.
- 브라우저 → `GET /api/charms` (Next.js) → `GET {API_BASE_URL}/api/charms` (백엔드)
- CORS: 브라우저는 Next.js만 호출하므로 백엔드에 프론트 origin CORS가 필수는 아닙니다.

---

## 공통

| 항목 | 내용 |
|------|------|
| Content-Type | `application/json; charset=utf-8` |
| Accept | `application/json` |
| 인증 | 현재 공개 사전조사 폼 — 인증 헤더 없음 |

### 에러 응답 형식

모든 실패 응답은 가능하면 아래 JSON을 사용합니다.

```json
{
  "error": {
    "code": "DUPLICATE_STUDENT",
    "message": "이미 접수된 학번입니다."
  }
}
```

| HTTP | code (예시) | 의미 |
|------|-------------|------|
| 400 | `VALIDATION_ERROR` | 요청 본문 검증 실패 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `DUPLICATE_STUDENT` | 동일 `student_id` 이미 존재 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |
| 502 | `UPSTREAM_UNAVAILABLE` | Next 프록시가 백엔드에 연결 실패 (프록시 전용) |
| 503 | `CONFIG_MISSING` | `API_BASE_URL` 미설정 (프록시 전용) |

---

## 도메인 규약

### `student_id` (학번)

- ERD 라벨: 학번
- 타입: **문자열**, 정확히 **10자리 숫자** (예: `"2024123456"`)
- Primary Key로 사용합니다. (`charm_id`만 UUID)

### `gender`

| 값 | 의미 |
|----|------|
| `false` | 남자 |
| `true` | 여자 |

### `charm_id`

- UUID 문자열 (예: `"550e8400-e29b-41d4-a716-446655440000"`)

---

## ERD ↔ API 매핑

| ERD 테이블 | 역할 | API에서의 반영 |
|------------|------|----------------|
| `Student` | 신청자 기본 정보 | `POST /api/surveys` 본문의 `student_id`, `name`, `gender`, `age`, `mbti` |
| `Charm` | 매력 태그 마스터 | `GET /api/charms` |
| `Have` | 내가 가진 매력 (M:N) | `have_charm_ids[]` → `(student_id, charm_id)` rows |
| `Want` | 원하는 이상형 매력 (M:N) | `want_charm_ids[]` → `(student_id, charm_id)` rows |
| `ExHave` | 추가 어필 자유 텍스트 | `ex_have` (있을 때만 1행) |
| `ExWant` | 추가 이상형 자유 텍스트 | `ex_want` (있을 때만 1행) |

---

## 1. GET `/api/charms`

매력 태그 마스터 목록을 반환합니다.  
폼의 「나의 매력은…」「나의 이상형은…」 태그 UI에 공통으로 사용합니다.

### Request

```
GET /api/charms
```

쿼리/바디 없음.

### Response `200 OK`

```json
{
  "charms": [
    {
      "charm_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "유머러스한"
    },
    {
      "charm_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "다정한"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `charms` | array | Charm 목록 |
| `charms[].charm_id` | string (UUID) | PK |
| `charms[].name` | string | 매력 이름 (태그 라벨) |

---

## 2. GET `/api/stats`

참여 현황 통계입니다. 랜딩의 파이 차트에 사용합니다.  
`Student.gender` 기준으로 집계합니다.

### Request

```
GET /api/stats
```

### Response `200 OK`

```json
{
  "total": 42,
  "male": 20,
  "female": 22
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `total` | number | 전체 신청 수 (`Student` 행 수) |
| `male` | number | `gender === false` |
| `female` | number | `gender === true` |

`total`이 0이면 `male`/`female`도 0입니다.

---

## 3. POST `/api/surveys`

사전조사 일괄 제출입니다. **하나의 트랜잭션**으로 처리하는 것을 권장합니다.

### Request

```
POST /api/surveys
Content-Type: application/json
```

```json
{
  "student_id": "2024123456",
  "name": "홍길동",
  "gender": false,
  "age": 22,
  "mbti": "ENFP",
  "have_charm_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  ],
  "want_charm_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "ex_have": "요리 잘해요",
  "ex_want": "함께 운동할 사람"
}
```

### Request body

| 필드 | 타입 | 필수 | 설명 | ERD |
|------|------|------|------|-----|
| `student_id` | string | O | 학번 10자리 | `Student.student_id` |
| `name` | string | O | 이름 | `Student.name` |
| `gender` | boolean | O | 성별 | `Student.gender` |
| `age` | integer | O | 나이 | `Student.age` |
| `mbti` | string | O | MBTI 4글자 (예: `ENFP`) | `Student.mbti` |
| `have_charm_ids` | string[] | O | 내 매력 Charm UUID 목록 (1개 이상) | `Have` |
| `want_charm_ids` | string[] | O | 이상형 Charm UUID 목록 (1개 이상) | `Want` |
| `ex_have` | string \| null | X | 추가 어필 텍스트. 빈 값이면 `null` 또는 생략 | `ExHave.charm` |
| `ex_want` | string \| null | X | 추가 이상형 텍스트. 빈 값이면 `null` 또는 생략 | `ExWant.charm` |

### 서버 처리 순서 (권장)

1. `student_id` 중복 검사 → 있으면 **409**
2. `have_charm_ids` / `want_charm_ids`의 모든 ID가 `Charm`에 존재하는지 검증 → 없으면 **400**
3. `Student` INSERT
4. `Have` INSERT (각 `have_charm_ids` 항목)
5. `Want` INSERT (각 `want_charm_ids` 항목)
6. `ex_have`가 non-null/non-empty이면 `ExHave`에 1행 INSERT (`student_id`, `charm`)
7. `ex_want`가 non-null/non-empty이면 `ExWant`에 1행 INSERT (`student_id`, `charm`)
8. 커밋 후 **201** 반환

실패 시 전체 롤백합니다.

### Response `201 Created`

```json
{
  "student_id": "2024123456"
}
```

### Response `409 Conflict`

```json
{
  "error": {
    "code": "DUPLICATE_STUDENT",
    "message": "이미 접수된 학번입니다."
  }
}
```

### Response `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "have_charm_ids must contain at least one valid charm_id"
  }
}
```

---

## 프론트엔드 연동 요약

브라우저는 **항상 같은 origin**의 경로만 호출합니다.

| 시점 | 메서드 | 경로 (브라우저) | 프록시 대상 (서버) |
|------|--------|-----------------|-------------------|
| 페이지 로드 | GET | `/api/charms` | `{API_BASE_URL}/api/charms` |
| 페이지 로드 | GET | `/api/stats` | `{API_BASE_URL}/api/stats` |
| 제출 버튼 | POST | `/api/surveys` | `{API_BASE_URL}/api/surveys` |
| 제출 성공 후 | GET | `/api/stats` | `{API_BASE_URL}/api/stats` |

- 클라이언트: [`src/lib/api.ts`](../src/lib/api.ts)
- 프록시: [`src/app/api/[...path]/route.ts`](../src/app/api/[...path]/route.ts)
- 환경 변수 예시: [`.env.local.example`](../.env.local.example)

```bash
cp .env.local.example .env.local
# API_BASE_URL 을 실제 백엔드 주소로 수정 (서버 전용)
```
