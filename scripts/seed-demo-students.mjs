import { neon } from '@neondatabase/serverless';

const CONSENT_VERSIONS = ['2026.09.09-3', '2026.09.09-3-tp'];

const PEOPLE = [
  {
    key: 'm01',
    name: '김민준',
    female: false,
    major_id: 'computer-software',
    age: 21,
    mbti: 'ENTJ',
    age_prefs: ['same', 'younger'],
    have: ['운동하는', '유머러스한', '키가 큰'],
    want: ['성격이 밝은', '다정한', '옷을 잘 입는'],
    ex_have: '주 3회 헬스장에 가요. 같이 운동하고 맛집 탐방하는 걸 좋아해요.',
    ex_want: '밝고 솔직한 사람이면 좋겠어요. 카페에서 오래 이야기할 수 있는 분.',
  },
  {
    key: 'm02',
    name: '이서준',
    female: false,
    major_id: 'info-comm',
    age: 20,
    mbti: 'ENFP',
    age_prefs: ['any'],
    have: ['대화를 잘하는', '솔직한', '성격이 밝은'],
    want: ['조용한', '말을 잘 들어주는', '귀여운'],
    ex_have: '처음 만난 사람과도 금방 친해져요. 노래방이면 더 신이 나요.',
    ex_want: '차분하게 제 이야기도 들어 주는 사람이면 좋겠어요.',
  },
  {
    key: 'm03',
    name: '박도윤',
    female: false,
    major_id: 'game-contents',
    age: 22,
    mbti: 'ISTP',
    age_prefs: ['same'],
    have: ['운동하는', '운전을 잘하는', '유머러스한'],
    want: ['요리를 잘하는', '다정한'],
    ex_have: '게임도 좋아하지만 주말엔 드라이브 나가는 편이에요.',
    ex_want: '집밥 해주거나 같이 요리할 수 있는 사람이면 설레요.',
  },
  {
    key: 'm04',
    name: '최하준',
    female: false,
    major_id: 'business',
    age: 23,
    mbti: 'ISTJ',
    age_prefs: ['younger', 'same'],
    have: ['솔직한', '조용한', '운전을 잘하는'],
    want: ['대화를 잘하는', '성격이 밝은'],
    ex_have: '약속은 꼭 지켜요. 조용한 편인데 친해지면 농담도 잘해요.',
    ex_want: '분위기를 밝게 만들어 주는 사람을 만나고 싶어요.',
  },
  {
    key: 'm05',
    name: '정시우',
    female: false,
    major_id: 'hotel-culinary',
    age: 20,
    mbti: 'ESFP',
    age_prefs: ['any'],
    have: ['요리를 잘하는', '유머러스한', '성격이 밝은'],
    want: ['노래를 잘하는', '옷을 잘 입는'],
    ex_have: '파스타랑 디저트 자신 있어요. 친구들 생일은 제가 케이크 해요.',
    ex_want: '같이 축제 무대도 보고 노래도 부를 수 있는 분이면 좋겠어요.',
  },
  {
    key: 'm06',
    name: '윤주원',
    female: false,
    major_id: 'military',
    age: 24,
    mbti: 'ESTJ',
    age_prefs: ['younger', 'same'],
    have: ['운동하는', '키가 큰', '솔직한'],
    want: ['다정한', '말을 잘 들어주는'],
    ex_have: '체력은 자신 있어요. 계획 세우고 실행하는 걸 좋아합니다.',
    ex_want: '따뜻하고 공감 잘 해주는 사람이면 제가 더 편해질 것 같아요.',
  },
  {
    key: 'm07',
    name: '장지호',
    female: false,
    major_id: 'architecture',
    age: 21,
    mbti: 'INTP',
    age_prefs: ['same', 'older'],
    have: ['조용한', '유머러스한', '옷을 잘 입는'],
    want: ['긴 머리', '귀여운', '성격이 밝은'],
    ex_have: '전시회나 카페 투어를 좋아해요. 드립 커피도 내려 드려요.',
    ex_want: '귀엽고 밝은 에너지로 저를 끌어다 주는 사람이면 좋겠어요.',
  },
  {
    key: 'm08',
    name: '임준서',
    female: false,
    major_id: 'police-security',
    age: 22,
    mbti: 'ESTP',
    age_prefs: ['any'],
    have: ['운동하는', '운전을 잘하는', '키가 큰'],
    want: ['단발 머리', '유머러스한'],
    ex_have: '농구랑 클라이밍 해요. 즉흥 여행도 잘 따라가요.',
    ex_want: '유머 코드가 맞고 활동적인 분이면 딱이에요.',
  },
  {
    key: 'm09',
    name: '한건우',
    female: false,
    major_id: 'webtoon',
    age: 19,
    mbti: 'INFP',
    age_prefs: ['same'],
    have: ['다정한', '말을 잘 들어주는', '조용한'],
    want: ['성격이 밝은', '노래를 잘하는'],
    ex_have: '웹툰 그리는 걸 좋아하고, 속마음은 편지에 잘 담아요.',
    ex_want: '밝게 먼저 말 걸어 주는 사람이면 제가 더 용기를 낼 수 있어요.',
  },
  {
    key: 'm10',
    name: '오지훈',
    female: false,
    major_id: 'undeclared',
    age: 20,
    mbti: 'ENTP',
    age_prefs: ['younger', 'same', 'older'],
    have: ['대화를 잘하는', '유머러스한', '솔직한'],
    want: ['요리를 잘하는', '다정한', '키가 작은'],
    ex_have: '토론이랑 드립이 취미예요. 밤샘 수다도 괜찮아요.',
    ex_want: '집밥이랑 다정한 말 한마디면 저 바로 설레요.',
  },
  {
    key: 'f01',
    name: '김서연',
    female: true,
    major_id: 'computer-software',
    age: 20,
    mbti: 'ENFJ',
    age_prefs: ['same', 'older'],
    have: ['다정한', '성격이 밝은', '옷을 잘 입는'],
    want: ['유머러스한', '대화를 잘하는'],
    ex_have: '사람 챙기는 걸 좋아하고, 코디 조언도 잘해 줘요.',
    ex_want: '유머 감각 있고 대화가 끊기지 않는 사람이면 좋겠어요.',
  },
  {
    key: 'f02',
    name: '이지아',
    female: true,
    major_id: 'nursing',
    age: 21,
    mbti: 'ISFJ',
    age_prefs: ['older', 'same'],
    have: ['말을 잘 들어주는', '요리를 잘하는', '다정한'],
    want: ['운동하는', '키가 큰'],
    ex_have: '집밥이랑 죽 끓이는 건 자신 있어요. 힘든 날엔 제가 먼저 안아 줘요.',
    ex_want: '같이 산책하거나 운동할 수 있는, 듬직한 사람이면 좋겠어요.',
  },
  {
    key: 'f03',
    name: '박하윤',
    female: true,
    major_id: 'early-childhood',
    age: 19,
    mbti: 'INFP',
    age_prefs: ['same'],
    have: ['귀여운', '조용한', '긴 머리'],
    want: ['유머러스한', '솔직한'],
    ex_have: '그림책이랑 영화 보는 걸 좋아해요. 낯가림은 조금 있어요.',
    ex_want: '솔직하고 웃겨 주는 사람이면 금방 편해질 것 같아요.',
  },
  {
    key: 'f04',
    name: '최수아',
    female: true,
    major_id: 'fashion-design-business',
    age: 22,
    mbti: 'ESFP',
    age_prefs: ['any'],
    have: ['옷을 잘 입는', '단발 머리', '성격이 밝은'],
    want: ['운전을 잘하는', '대화를 잘하는'],
    ex_have: '쇼핑이랑 사진 찍는 게 취미예요. 분위기를 잘 살려요.',
    ex_want: '드라이브하면서 수다 떨 수 있는 사람을 원해요.',
  },
  {
    key: 'f05',
    name: '정예은',
    female: true,
    major_id: 'k-pop',
    age: 20,
    mbti: 'ENFP',
    age_prefs: ['same', 'older'],
    have: ['노래를 잘하는', '귀여운', '유머러스한'],
    want: ['운동하는', '성격이 밝은'],
    ex_have: '버스킹이랑 축제 무대가 제일 신나요. 같이 춤출 사람 구해요!',
    ex_want: '에너지 넘치고 운동도 즐기는 사람이면 더 재밌을 거예요.',
  },
  {
    key: 'f06',
    name: '윤채원',
    female: true,
    major_id: 'airline-service',
    age: 21,
    mbti: 'ISFP',
    age_prefs: ['older'],
    have: ['옷을 잘 입는', '다정한', '키가 작은'],
    want: ['키가 큰', '유머러스한'],
    ex_have: '여행 영상을 자주 봐요. 작은 선물 고르는 덴 자신 있어요.',
    ex_want: '키 크고 유머 있는 분이면 같이 여행 가고 싶어요.',
  },
  {
    key: 'f07',
    name: '장민서',
    female: true,
    major_id: 'social-welfare',
    age: 23,
    mbti: 'INFJ',
    age_prefs: ['same', 'older'],
    have: ['말을 잘 들어주는', '조용한', '솔직한'],
    want: ['대화를 잘하는', '다정한'],
    ex_have: '고민 상담은 제가 잘해요. 밤하늘 보면서 이야기하는 거 좋아해요.',
    ex_want: '다정하게 먼저 말 걸어 주고, 대화가 깊은 사람이면 좋겠어요.',
  },
  {
    key: 'f08',
    name: '임소율',
    female: true,
    major_id: 'food-nutrition',
    age: 20,
    mbti: 'ESFJ',
    age_prefs: ['any'],
    have: ['요리를 잘하는', '다정한', '성격이 밝은'],
    want: ['운동하는', '솔직한'],
    ex_have: '다이어트 식단이든 집밥이든 맞춰 드려요. 같이 먹으면 더 맛있어요.',
    ex_want: '건강하게 운동하는, 솔직한 사람이면 오래 볼 수 있을 것 같아요.',
  },
  {
    key: 'f09',
    name: '한지우',
    female: true,
    major_id: 'visual-design',
    age: 22,
    mbti: 'ENTJ',
    age_prefs: ['same'],
    have: ['대화를 잘하는', '옷을 잘 입는', '솔직한'],
    want: ['유머러스한', '운전을 잘하는'],
    ex_have: '전시 기획 동아리 해요. 할 말은 돌려 말하지 않는 편이에요.',
    ex_want: '웃겨 주고 가끔 드라이브도 시켜 주는 사람이면 좋겠어요.',
  },
  {
    key: 'f10',
    name: '오하은',
    female: true,
    major_id: 'game-contents',
    age: 19,
    mbti: 'INTP',
    age_prefs: ['same', 'older'],
    have: ['유머러스한', '조용한', '단발 머리'],
    want: ['대화를 잘하는', '키가 큰'],
    ex_have: '게임 같이 할 사람 환영이에요. 평소엔 조용한데 드립은 잘 쳐요.',
    ex_want: '말주변 좋고 듬직한 사람이면 제가 더 많이 웃을 수 있을 거예요.',
  },
];

function uuidFromKey(key) {
  const n = key.startsWith('m') ? Number(key.slice(1)) : 100 + Number(key.slice(1));
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL이 없습니다.');
}

const sql = neon(databaseUrl);

const charmRows = await sql`SELECT charm_id::text AS charm_id, name FROM charm`;
const charmByName = new Map(charmRows.map((row) => [row.name, row.charm_id]));
for (const person of PEOPLE) {
  for (const tag of [...person.have, ...person.want]) {
    if (!charmByName.has(tag)) {
      throw new Error(`없는 매력 태그: ${tag}`);
    }
  }
}

const users = PEOPLE.map((person) => ({
  google_sub: `seed-test-${person.key}`,
  email: `qrious.test.${person.key}@yeonsung.ac.kr`,
  name: `${person.name}(학생)`,
}));

const students = PEOPLE.map((person) => ({
  student_id: uuidFromKey(person.key),
  name: person.name,
  phone: `010-71${person.key.startsWith('m') ? '00' : '10'}-${person.key.slice(1).padStart(4, '0')}`,
  gender: person.female,
  age: person.age,
  mbti: person.mbti,
  google_sub: `seed-test-${person.key}`,
  email: `qrious.test.${person.key}@yeonsung.ac.kr`,
  major_id: person.major_id,
}));

await sql`
  INSERT INTO google_user (google_sub, email, name)
  SELECT *
  FROM unnest(
    ${users.map((u) => u.google_sub)}::text[],
    ${users.map((u) => u.email)}::text[],
    ${users.map((u) => u.name)}::text[]
  ) AS t(google_sub, email, name)
  ON CONFLICT (google_sub) DO NOTHING
`;

await sql`
  INSERT INTO student (
    student_id, name, phone, gender, age, mbti, google_sub, email, major_id
  )
  SELECT *
  FROM unnest(
    ${students.map((s) => s.student_id)}::text[],
    ${students.map((s) => s.name)}::text[],
    ${students.map((s) => s.phone)}::text[],
    ${students.map((s) => s.gender)}::boolean[],
    ${students.map((s) => s.age)}::int[],
    ${students.map((s) => s.mbti)}::text[],
    ${students.map((s) => s.google_sub)}::text[],
    ${students.map((s) => s.email)}::text[],
    ${students.map((s) => s.major_id)}::text[]
  ) AS t(
    student_id, name, phone, gender, age, mbti, google_sub, email, major_id
  )
  ON CONFLICT (student_id) DO NOTHING
`;

const agePrefPairs = PEOPLE.flatMap((person) =>
  person.age_prefs.map((age_pref_id) => ({
    student_id: uuidFromKey(person.key),
    age_pref_id,
  }))
);
await sql`
  INSERT INTO prefer_age (student_id, age_pref_id)
  SELECT *
  FROM unnest(
    ${agePrefPairs.map((row) => row.student_id)}::text[],
    ${agePrefPairs.map((row) => row.age_pref_id)}::text[]
  ) AS t(student_id, age_pref_id)
  ON CONFLICT DO NOTHING
`;

const havePairs = PEOPLE.flatMap((person) =>
  person.have.map((name) => ({
    student_id: uuidFromKey(person.key),
    charm_id: charmByName.get(name),
  }))
);
await sql`
  INSERT INTO have (student_id, charm_id)
  SELECT *
  FROM unnest(
    ${havePairs.map((row) => row.student_id)}::text[],
    ${havePairs.map((row) => row.charm_id)}::uuid[]
  ) AS t(student_id, charm_id)
  ON CONFLICT DO NOTHING
`;

const wantPairs = PEOPLE.flatMap((person) =>
  person.want.map((name) => ({
    student_id: uuidFromKey(person.key),
    charm_id: charmByName.get(name),
  }))
);
await sql`
  INSERT INTO want (student_id, charm_id)
  SELECT *
  FROM unnest(
    ${wantPairs.map((row) => row.student_id)}::text[],
    ${wantPairs.map((row) => row.charm_id)}::uuid[]
  ) AS t(student_id, charm_id)
  ON CONFLICT DO NOTHING
`;

await sql`
  INSERT INTO ex_have (student_id, charm)
  SELECT *
  FROM unnest(
    ${PEOPLE.map((person) => uuidFromKey(person.key))}::text[],
    ${PEOPLE.map((person) => person.ex_have)}::text[]
  ) AS t(student_id, charm)
  ON CONFLICT (student_id) DO NOTHING
`;

await sql`
  INSERT INTO ex_want (student_id, charm)
  SELECT *
  FROM unnest(
    ${PEOPLE.map((person) => uuidFromKey(person.key))}::text[],
    ${PEOPLE.map((person) => person.ex_want)}::text[]
  ) AS t(student_id, charm)
  ON CONFLICT (student_id) DO NOTHING
`;

const studentIds = PEOPLE.map((person) => uuidFromKey(person.key));
await sql`
  INSERT INTO consent (
    student_id, notice_version, agreed, consent_text_snapshot, consent_hash,
    ip_address, user_agent
  )
  SELECT
    sid,
    n.version,
    true,
    n.body,
    n.body_hash,
    '127.0.0.1',
    'seed-test-surveys'
  FROM unnest(${studentIds}::text[]) AS sid
  CROSS JOIN consent_notice AS n
  WHERE n.version = ANY(${CONSENT_VERSIONS}::text[])
  ON CONFLICT (student_id, notice_version) DO NOTHING
`;

const summary = await sql`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE gender = false)::int AS male,
    COUNT(*) FILTER (WHERE gender = true)::int AS female
  FROM student
`;
const tagged = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM have) AS have_rows,
    (SELECT COUNT(*)::int FROM want) AS want_rows,
    (SELECT COUNT(*)::int FROM prefer_age) AS age_pref_rows,
    (SELECT COUNT(*)::int FROM ex_have) AS ex_have_rows,
    (SELECT COUNT(*)::int FROM ex_want) AS ex_want_rows,
    (SELECT COUNT(*)::int FROM consent) AS consent_rows
`;

console.log(JSON.stringify({ summary: summary[0], tagged: tagged[0] }, null, 2));
