# QRious Survey API Specification

Next.js Route Handlers가 Neon Postgres에 직접 연결합니다.  
별도 백엔드 서버는 없습니다. ERD: `student`, `charm`, `have`, `want`, `ex_have`, `ex_want`.

브라우저는 같은 origin의 `/api/*`만 호출하고, 서버만 `DATABASE_URL`로 Neon에 접속합니다.

---

## Base URL / 환경 변수

서버 전용 (브라우저에 노출되지 않음):

```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

- Neon 콘솔의 **pooled** 연결 문자열을 사용합니다.
- 브라우저 → `GET /api/charms` (Next.js) → Neon SQL

---

## 공통

| 항목 | 내용 |
|------|------|
| Content-Type | `application/json; charset=utf-8` |
| Accept | `application/json` |
| 인증 | 현재 공개 사전조사 폼 — 인증 헤더 없음 |

### 에러 응답 형식

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
| 409 | `DUPLICATE_STUDENT` | 동일 `student_id` 이미 존재 |
| 500 | `INTERNAL_ERROR` | 서버/DB 오류 |
| 503 | `CONFIG_MISSING` | `DATABASE_URL` 미설정 |

---

## 도메인 규약

### `student_id` (학번)

- 타입: **문자열**, 정확히 **10자리 숫자**
- Primary Key (`student.student_id`)

### `gender`

| 값 | 의미 |
|----|------|
| `false` | 남자 |
| `true` | 여자 |

### `charm_id`

- UUID 문자열

---

## ERD ↔ API 매핑

| 테이블 | 역할 | API |
|--------|------|-----|
| `student` | 신청자 기본 정보 | `POST /api/surveys` |
| `charm` | 매력 태그 마스터 | `GET /api/charms` |
| `have` | 내가 가진 매력 | `have_charm_ids[]` |
| `want` | 원하는 이상형 매력 | `want_charm_ids[]` |
| `ex_have` | 추가 어필 텍스트 | `ex_have` (있을 때만) |
| `ex_want` | 추가 이상형 텍스트 | `ex_want` (있을 때만) |

---

## 1. GET `/api/charms`

### Response `200 OK`

```json
{
  "charms": [
    { "charm_id": "550e8400-e29b-41d4-a716-446655440000", "name": "유머러스한" }
  ]
}
```

구현: [`src/app/api/charms/route.ts`](../src/app/api/charms/route.ts)

---

## 2. GET `/api/stats`

`student.gender` 기준 집계.

### Response `200 OK`

```json
{ "total": 42, "male": 20, "female": 22 }
```

구현: [`src/app/api/stats/route.ts`](../src/app/api/stats/route.ts)

---

## 3. POST `/api/surveys`

트랜잭션으로 일괄 저장합니다.

### Request body

| 필드 | 타입 | 필수 | ERD |
|------|------|------|-----|
| `student_id` | string | O | `student.student_id` |
| `name` | string | O | `student.name` |
| `gender` | boolean | O | `student.gender` |
| `age` | integer | O | `student.age` |
| `mbti` | string | O | `student.mbti` |
| `have_charm_ids` | string[] | O | `have` |
| `want_charm_ids` | string[] | O | `want` |
| `ex_have` | string \| null | X | `ex_have.charm` |
| `ex_want` | string \| null | X | `ex_want.charm` |

### Response `201 Created`

```json
{ "student_id": "2024123456" }
```

구현: [`src/app/api/surveys/route.ts`](../src/app/api/surveys/route.ts)

---

## 프론트엔드 연동

| 시점 | 메서드 | 경로 |
|------|--------|------|
| 페이지 로드 | GET | `/api/charms` |
| 페이지 로드 | GET | `/api/stats` |
| 제출 | POST | `/api/surveys` |

- 클라이언트: [`src/lib/api.ts`](../src/lib/api.ts)
- DB 클라이언트: [`src/lib/db.ts`](../src/lib/db.ts)
- 환경 변수: [`.env.local.example`](../.env.local.example)

```bash
cp .env.local.example .env.local
# Neon pooled DATABASE_URL 입력 후 npm run dev
```
