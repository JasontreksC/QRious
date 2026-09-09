import { neon } from '@neondatabase/serverless';

const MBTI = [
  'ENTJ',
  'ISFJ',
  'ENFP',
  'ISTP',
  'INFJ',
  'ESTP',
  'INTP',
  'ESFJ',
  'ENTP',
  'ISFP',
  'ESTJ',
  'INFP',
];

const MAJOR_ID = {
  컴퓨터소프트웨어과: 'computer-software',
  간호학과: 'nursing',
  경영학과: 'business',
  게임콘텐츠과: 'game-contents',
  유아교육과: 'early-childhood',
  호텔외식조리과: 'hotel-culinary',
  자유전공학과: 'undeclared',
  경찰경호보안과: 'police-security',
  영상콘텐츠제작전공: 'video-contents',
  패션디자인비즈니스과: 'fashion-design-business',
  항공서비스과: 'airline-service',
  정보통신과: 'info-comm',
  'K-POP과': 'k-pop',
  치위생과: 'dental-hygiene',
  건축과: 'architecture',
  사회복지과: 'social-welfare',
};

const PEOPLE = [
  ['김민준', false, '컴퓨터소프트웨어과'],
  ['이서준', false, '컴퓨터소프트웨어과'],
  ['박도윤', false, '컴퓨터소프트웨어과'],
  ['최하준', false, '컴퓨터소프트웨어과'],
  ['정시우', false, '컴퓨터소프트웨어과'],
  ['김서연', true, '컴퓨터소프트웨어과'],
  ['이지아', true, '컴퓨터소프트웨어과'],
  ['박하윤', true, '컴퓨터소프트웨어과'],
  ['윤주원', false, '간호학과'],
  ['장지호', false, '간호학과'],
  ['최수아', true, '간호학과'],
  ['정예은', true, '간호학과'],
  ['윤채원', true, '간호학과'],
  ['장민서', true, '간호학과'],
  ['임준서', false, '경영학과'],
  ['한건우', false, '경영학과'],
  ['오지훈', false, '경영학과'],
  ['임소율', true, '경영학과'],
  ['한지우', true, '경영학과'],
  ['서은우', false, '게임콘텐츠과'],
  ['신유준', false, '게임콘텐츠과'],
  ['오하은', true, '게임콘텐츠과'],
  ['서다은', true, '게임콘텐츠과'],
  ['배성민', false, '유아교육과'],
  ['문태양', false, '유아교육과'],
  ['신유나', true, '유아교육과'],
  ['배수빈', true, '유아교육과'],
  ['조현우', false, '호텔외식조리과'],
  ['문가은', true, '호텔외식조리과'],
  ['조예린', true, '호텔외식조리과'],
  ['홍지환', false, '자유전공학과'],
  ['안우진', false, '자유전공학과'],
  ['홍서윤', true, '자유전공학과'],
  ['권민재', false, '경찰경호보안과'],
  ['송하율', false, '경찰경호보안과'],
  ['안나경', true, '경찰경호보안과'],
  ['백도현', false, '영상콘텐츠제작전공'],
  ['권지민', true, '영상콘텐츠제작전공'],
  ['송하늘', true, '영상콘텐츠제작전공'],
  ['남준혁', false, '패션디자인비즈니스과'],
  ['백예원', true, '패션디자인비즈니스과'],
  ['유지호', false, '항공서비스과'],
  ['남소희', true, '항공서비스과'],
  ['강태윤', false, '정보통신과'],
  ['윤아린', true, '정보통신과'],
  ['전시현', false, 'K-POP과'],
  ['강다현', true, 'K-POP과'],
  ['노하람', false, '치위생과'],
  ['허은호', false, '건축과'],
  ['전지유', true, '사회복지과'],
];

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL이 없습니다.');
}

const sql = neon(databaseUrl);

const users = PEOPLE.map(([name], index) => {
  const n = String(index + 1).padStart(2, '0');
  return {
    google_sub: `seed-virtual-${n}`,
    email: `qrious.seed.${n}@yeonsung.ac.kr`,
    name: `${name}(학생)`,
  };
});

const students = PEOPLE.map(([name, female, majorName], index) => {
  const n = String(index + 1).padStart(2, '0');
  const majorId = MAJOR_ID[majorName];
  if (!majorId) {
    throw new Error(`unknown major: ${majorName}`);
  }
  return {
    student_id: `00000000-0000-4000-8000-0000000000${n}`,
    name,
    phone: `010-7000-00${n}`,
    gender: female,
    age: 19 + (index % 8),
    mbti: MBTI[index % MBTI.length],
    google_sub: `seed-virtual-${n}`,
    email: `qrious.seed.${n}@yeonsung.ac.kr`,
    major_id: majorId,
  };
});

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

const summary = await sql`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE gender = false)::int AS male,
    COUNT(*) FILTER (WHERE gender = true)::int AS female
  FROM student
`;
const majors = await sql`
  SELECT m.short_name, COUNT(*)::int AS count
  FROM student s
  JOIN major m ON m.major_id = s.major_id
  GROUP BY m.short_name
  ORDER BY count DESC, m.short_name ASC
`;

console.log(JSON.stringify({ summary: summary[0], majors }, null, 2));
