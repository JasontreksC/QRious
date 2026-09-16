# QRious Survey API Specification

Next.js Route Handlers가 Neon Postgres에 직접 연결합니다.  
별도 백엔드 서버는 없습니다. ERD: `student`, `registration`, `major`, `charm`, `have`, `want`, `ex_have`, `ex_want`, `age_pref`, `prefer_age`, `consent_notice`, `consent`, `admin`, `match_result`.

브라우저는 같은 origin의 `/api/*`만 호출하고, 서버만 `DATABASE_URL`로 Neon에 접속합니다.

사전 접수(`POST /api/surveys`)는 연성대학교 Workspace 구글 계정(`@yeonsung.ac.kr`) 로그인 세션이 필요합니다.

---

## Base URL / 환경 변수

서버 전용 (브라우저에 노출되지 않음):

```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=
AUTH_URL=
```

- Neon 콘솔의 **pooled** 연결 문자열을 사용합니다.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`은 Google Cloud OAuth 2.0 **웹 클라이언트**입니다.
- 승인된 리디렉션 URI: `{origin}/api/auth/google/callback`  
  로컬 예: `http://localhost:3000/api/auth/google/callback`
- `AUTH_SECRET`은 `qrious_google` 세션 쿠키 HMAC 키입니다. 32바이트 이상 무작위 문자열을 넣으세요.
- `AUTH_URL`은 프록시/커스텀 도메인에서 OAuth `redirect_uri`를 고정할 때 사용합니다. 비우면 요청 Host / `x-forwarded-*`를 씁니다.

---

## 공통

| 항목 | 내용 |
|------|------|
| Content-Type | `application/json; charset=utf-8` |
| Accept | `application/json` |
| 인증 | httpOnly 쿠키 `qrious_google`. 관리자 API는 같은 세션의 이메일이 `admin` 테이블에 있을 때 허용 |

### 에러 응답 형식

```json
{
  "error": {
    "code": "DUPLICATE_GOOGLE",
    "message": "이미 이 구글 계정으로 접수했습니다."
  }
}
```

| HTTP | code (예시) | 의미 |
|------|-------------|------|
| 400 | `VALIDATION_ERROR` | 요청 본문 검증 실패 |
| 401 | `UNAUTHORIZED` | 구글 세션 없음 (설문 제출) 또는 관리자 미인증 |
| 403 | `NOT_STUDENT` | 구글 표시 이름이 `성함(학생)` 형식이 아님 |
| 409 | `DUPLICATE_GOOGLE` | 동일 구글 계정으로 이미 접수 |
| 500 | `INTERNAL_ERROR` | 서버/DB 오류 |
| 503 | `CONFIG_MISSING` | `DATABASE_URL` 미설정 |

OAuth 콜백이 실패하면 JSON 대신 홈으로 리다이렉트하며 `?error=`를 붙입니다.

| `error` | 의미 |
|---------|------|
| `domain` | `@yeonsung.ac.kr`이 아닌 계정 |
| `google` | 구글 토큰 교환/상태 검증 실패 |
| `not_student` | 구글 표시 이름이 `성함(학생)`이 아님 |
| `config` | `GOOGLE_CLIENT_*` 또는 `AUTH_SECRET` 미설정 |

---

## 도메인 규약

### `student_id`

- 서버가 발급하는 UUID 문자열 (폼에서 입력받지 않음)
- Primary Key (`student.student_id`) — 한 사람의 인적사항
- 참가자 식별은 이름 + 전화번호입니다. 같은 사람은 차수가 달라도 한 행입니다. 생년월일(YYMMDD)은 로그인 때 받아 `student.birth`에 두고, 나이는 저장하지 않습니다.

### `registration_id`

- 서버가 발급하는 UUID 문자열
- Primary Key (`registration.registration_id`) — 차수별 접수 한 건
- 매력·이상형·나이선호·동의·매칭(`match_result.male_id` / `female_id`)이 이 키를 가리킵니다.
- Unique `(student_id, round)`

### `major_id`

- `major` 마스터 테이블 PK (영문 슬러그)
- 정식 학과명 `name`, 차트용 약칭 `short_name` (`컴소과`, `겜콘과` 등)
- 카탈로그: [`majors.txt`](../majors.txt), 런타임: `GET /api/majors` (가나다 정렬)

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
| `student` | 인적사항 (이름, 전화, 생년월일, 성별, 학과) | `POST`/`GET`/`PATCH`/`DELETE /api/surveys` |
| `registration` | 차수별 접수 (MBTI) | 같은 surveys API, 관리자 목록의 한 행 |
| `major` | 학과 마스터 (정식명·약칭) | `GET /api/majors` |
| `charm` | 매력 태그 마스터 | `GET /api/charms` |
| `have` | 내가 가진 매력 (`registration_id`) | `have_charm_ids[]` |
| `want` | 원하는 이상형 매력 (`registration_id`) | `want_charm_ids[]` |
| `ex_have` | 추가 어필 텍스트 | `ex_have` (있을 때만) |
| `ex_want` | 추가 이상형 텍스트 | `ex_want` (있을 때만) |
| `age_pref` | 선호 연령 마스터 (상관없음/연하/동갑/연상) | 고정 4행 |
| `prefer_age` | 접수 ↔ 선호 연령 | `age_pref_ids[]` |
| `consent_notice` | 버전별 동의문 원문·해시 | 제출 시 upsert (`ON CONFLICT DO NOTHING`) |
| `consent` | 동의 증빙 (`registration_id`, FK 없음) | `POST /api/surveys` |
| `admin` | 관리자 허용 이름·전화·생년월일 | `/admin` 및 `/api/admin/*` |

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

## 1b. GET `/api/majors`

`major` 테이블의 학과 목록. 클라이언트에서 가나다 순으로 정렬해 내려줍니다.

### Response `200 OK`

```json
{
  "majors": [
    { "major_id": "computer-software", "name": "컴퓨터소프트웨어과", "short_name": "컴소과" }
  ]
}
```

구현: [`src/app/api/majors/route.ts`](../src/app/api/majors/route.ts)

---

## 2. GET `/api/stats`

`student.gender` 기준 집계, 접수된 학과 수(`major_count`), 학과별 접수 TOP 10 (`majors`, 건수 내림차순). 건수는 `registration` 행(해당 차수 접수)입니다.

### Response `200 OK`

```json
{
  "total": 42,
  "male": 20,
  "female": 22,
  "major_count": 16,
  "majors": [
    { "major_id": "computer-software", "name": "컴퓨터소프트웨어과", "short_name": "컴소과", "count": 8 },
    { "major_id": "nursing", "name": "간호학과", "short_name": "간호학과", "count": 5 }
  ]
}
```

구현: [`src/app/api/stats/route.ts`](../src/app/api/stats/route.ts)

---

## 3. 구글 로그인

학교 Workspace 계정만 허용합니다 (이메일이 `@yeonsung.ac.kr`로 끝나야 함). PKCE + `openid email profile`. 구글 인가 URL에 `hd`는 넣지 않습니다. 넣으면 이메일 입력 없이 학교 SSO로 바로 가 모바일에서 멈추는 경우가 있습니다.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/auth/google` | Google 동의 화면으로 리다이렉트 |
| GET | `/api/auth/google/callback` | 토큰 교환, `성함(학생)` 검사, `google_user` upsert, `qrious_google` 쿠키, `/`로 리다이렉트 |
| GET | `/api/auth/session` | `{ authenticated: false }` 또는 프로필 + `submitted` + `isAdmin` |
| POST | `/api/auth/logout` | `qrious_google` 쿠키 삭제 |

구현: [`src/lib/google-auth.ts`](../src/lib/google-auth.ts), [`src/app/api/auth/`](../src/app/api/auth/)

---

## 4. POST `/api/surveys`

`qrious_session` 쿠키(이름+전화+생년월일)가 없으면 `401 UNAUTHORIZED`입니다.  
이름·전화번호·생년월일(`student.name`/`phone`/`birth`)은 로그인 세션에서만 가져오며 요청 본문으로 바꾸지 않습니다. `student_id`는 사람 PK, `registration_id`는 이번 차수 접수 PK입니다. 이미 같은 이름+전화로 등록된 사람이면 성별·학과를 갱신하고 새 접수만 추가합니다.

### Request body

| 필드 | 타입 | 필수 | ERD |
|------|------|------|-----|
| `gender` | boolean | O | `student.gender` |
| `major_id` | string | O | `student.major_id` → `major` |
| `age_pref_ids` | string[] | O | `prefer_age` — `['any']` 또는 `younger`/`same`/`older` 조합 |
| `mbti` | string | O | `registration.mbti` |
| `have_charm_ids` | string[] | O | `have` |
| `want_charm_ids` | string[] | O | `want` |
| `ex_have` | string \| null | X | `ex_have.charm` |
| `ex_want` | string \| null | X | `ex_want.charm` |
| `consent_agreed` | boolean | O | `consent.agreed` — 수집·이용, 반드시 `true` |
| `consent_version` | string | O | 현재 수집·이용 동의문 버전과 일치해야 함 |
| `third_party_consent_agreed` | boolean | O | `consent.agreed` — 제3자 제공, 반드시 `true` |
| `third_party_consent_version` | string | O | 현재 제3자 제공 동의문 버전과 일치해야 함 |

제출 시 서버는 수집·이용 동의문과 제3자 제공 동의문 전문·SHA-256 해시를 각각 `consent_notice` / `consent`에 저장합니다. IP(`x-forwarded-for`)와 User-Agent도 기록합니다. `consent.registration_id`는 `ON DELETE CASCADE`가 없어 접수 삭제 후에도 증빙이 남습니다.

현재 수집·이용 동의문 버전: `2026.09.15-2`  
현재 제3자 제공 동의문 버전: `2026.09.09-3-tp`  
(`src/lib/consent-notice.ts`)

### Response `201 Created`

```json
{ "student_id": "550e8400-e29b-41d4-a716-446655440000", "registration_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7" }
```

구현: [`src/app/api/surveys/route.ts`](../src/app/api/surveys/route.ts)

---

## 4b. GET `/api/surveys`

로그인한 본인의 접수 내용을 반환합니다. 접수 전이면 `404 NOT_FOUND`.

### Response `200 OK`

```json
{
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "registration_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "round": 1,
  "name": "우재성",
  "phone": "010-1234-5678",
  "gender": false,
  "birth": "040101",
  "mbti": "INTJ",
  "major_id": "computer-software",
  "major": "컴퓨터소프트웨어과",
  "age_pref_ids": ["same"],
  "age_prefs": ["동갑"],
  "have_charm_ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "have": ["유머러스한"],
  "want_charm_ids": ["550e8400-e29b-41d4-a716-446655440001"],
  "want": ["다정한"],
  "ex_have": "요리 잘해요",
  "ex_want": null
}
```

## 4c. PATCH `/api/surveys`

본인 접수의 일부 필드만 수정합니다. 보낸 키만 갱신합니다.

허용 키: `gender`, `major_id`, `mbti`, `age_pref_ids`, `have_charm_ids`, `want_charm_ids`, `ex_have`, `ex_want`.

성공 시 GET과 같은 본문을 반환합니다. 성별·학과(`gender`/`major_id`)는 `student`를 갱신하므로 다른 차수 화면에도 반영됩니다. 이름·전화번호·생년월일은 로그인 시에만 받고 여기서 수정하지 않습니다.

`DELETE /api/surveys`는 현재 차수 `registration`만 삭제합니다. 남은 접수가 없으면 `student`도 삭제합니다. consent는 유지됩니다.

---

## 5. 관리자 API

이름·전화번호·생년월일 세션이 `admin` 테이블의 같은 세 값과 일치하면 관리자입니다.

홈 화면 우측 상단 **관리자** 버튼은 이 조건이 맞을 때만 표시됩니다.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/session` | `{ "authenticated": true }` (구글 세션 + `admin` 테이블) |
| GET | `/api/admin/students` | 참가자 + have/want/ex + 학과 + 구글 이메일 + 수집·이용/제3자 제공 동의 |
| GET | `/api/admin/students/export` | 조인된 참가자 xlsx (`?q=` 이름/이메일/학과 검색) |
| DELETE | `/api/admin/students/{registrationId}` | 해당 차수 접수 삭제 (have/want/ex/prefer_age CASCADE, **consent는 유지**, 남은 접수가 없으면 student도 삭제) |
| POST | `/api/admin/charms` | `{ "name" }` 태그 추가 |
| DELETE | `/api/admin/charms/{charmId}` | 태그 삭제 (have/want CASCADE) |

UI: [`src/app/admin/students/page.tsx`](../src/app/admin/students/page.tsx), [`src/app/admin/charms/page.tsx`](../src/app/admin/charms/page.tsx)

---

## 프론트엔드 연동

| 시점 | 메서드 | 경로 |
|------|--------|------|
| 페이지 로드 | GET | `/api/auth/session` |
| 미로그인 | GET | `/api/auth/google` (브라우저 이동) |
| 페이지 로드 | GET | `/api/charms` |
| 페이지 로드 | GET | `/api/majors` |
| 페이지 로드 | GET | `/api/stats` |
| 제출 | POST | `/api/surveys` |
| 내 접수 조회 | GET | `/api/surveys` |
| 내 접수 수정 | PATCH | `/api/surveys` |
| 접수 취소 | DELETE | `/api/surveys` |
| 로그아웃 | POST | `/api/auth/logout` |

- 클라이언트: [`src/lib/api.ts`](../src/lib/api.ts)
- DB 클라이언트: [`src/lib/db.ts`](../src/lib/db.ts)
- 환경 변수: [`.env.local.example`](../.env.local.example)

```bash
cp .env.local.example .env.local
# Neon pooled DATABASE_URL, Google OAuth, AUTH_SECRET 입력 후 npm run dev
```
