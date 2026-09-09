-- Department master (학과). Students reference major_id instead of storing the name.

CREATE TABLE IF NOT EXISTS major (
  major_id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  short_name text NOT NULL UNIQUE
);

INSERT INTO major (major_id, name, short_name) VALUES
  ('electrical', '전기과', '전기과'),
  ('info-comm', '정보통신과', '정통과'),
  ('computer-software', '컴퓨터소프트웨어과', '컴소과'),
  ('electronics', '전자공학과', '전자과'),
  ('architecture', '건축과', '건축과'),
  ('interior-architecture', '실내건축과', '실내과'),
  ('fashion-design-business', '패션디자인비즈니스과', '패디과'),
  ('hair-design', '헤어디자인전공', '헤어전공'),
  ('makeup', '메이크업전공', '메이크업전공'),
  ('skincare', '스킨케어전공', '스킨케어전공'),
  ('game-contents', '게임콘텐츠과', '겜콘과'),
  ('webtoon', '웹툰만화콘텐츠과', '웹툰과'),
  ('video-contents', '영상콘텐츠제작전공', '영콘전공'),
  ('new-media', '뉴미디어콘텐츠전공', '뉴미디어전공'),
  ('visual-design', '시각디자인과', '시각과'),
  ('k-pop', 'K-POP과', 'K-POP과'),
  ('distribution', '유통물류과', '유통과'),
  ('business', '경영학과', '경영학과'),
  ('tax-accounting', '세무회계과', '세무과'),
  ('military', '국방군사학과', '국방과'),
  ('police-security', '경찰경호보안과', '경호과'),
  ('social-welfare', '사회복지과', '사복과'),
  ('social-welfare-mgmt', '사회복지경영과', '사복경영과'),
  ('early-childhood', '유아교육과', '유교과'),
  ('special-rehab', '유아특수재활과', '유특과'),
  ('child-psychology', '사회복지과 아동심리보육전공', '아동보육전공'),
  ('nursing', '간호학과', '간호학과'),
  ('dental-hygiene', '치위생과', '치위생과'),
  ('dental-tech', '치기공과', '치기공과'),
  ('occupational-therapy', '작업치료과', '작치과'),
  ('sports-rehab', '스포츠재활과', '스포재과'),
  ('emergency', '응급구조과', '응급과'),
  ('health-admin', '보건의료행정과', '보행과'),
  ('food-nutrition', '식품영양학과', '식영과'),
  ('pet-health', '반려동물보건과', '반보과'),
  ('pet-industry', '반려동물산업과', '반산과'),
  ('airline-service', '항공서비스과', '항서과'),
  ('tourism-english', '관광영어과', '관영과'),
  ('hotel-tourism', '호텔관광과', '호관과'),
  ('hotel-culinary', '호텔외식조리과', '조리과'),
  ('cafe-bakery', '카페.베이커리과', '카베과'),
  ('hotel-fnb-mgmt', '호텔외식경영전공', '외식경영전공'),
  ('undeclared', '자유전공학과', '자전과')
ON CONFLICT (major_id) DO UPDATE
SET name = EXCLUDED.name,
    short_name = EXCLUDED.short_name;

ALTER TABLE student
  ADD COLUMN IF NOT EXISTS major_id text REFERENCES major (major_id);

UPDATE student AS s
SET major_id = m.major_id
FROM major AS m
WHERE s.major_id IS NULL
  AND s.major IS NOT NULL
  AND BTRIM(s.major) = m.name;

CREATE INDEX IF NOT EXISTS idx_student_major_id ON student (major_id);

ALTER TABLE student DROP COLUMN IF EXISTS major;
