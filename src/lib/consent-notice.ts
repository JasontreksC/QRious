/** 개인정보 보호법 제15조 제2항 필수 고지 항목을 담은 동의문 (버전 관리). */

export const CONSENT_VERSION = '2026.08.31-1';

export const CONSENT_TITLE = '개인정보 수집·이용 동의서';

export const CONSENT_PROCESSOR = 'QRious 운영팀';

export const CONSENT_PURPOSE =
  'QR 소개팅 사전접수 접수 확인, 참가자 식별, 매칭 수행 및 행사 안내 연락';

export const CONSENT_ITEMS =
  '학번, 이름, 전화번호, 성별, 나이, MBTI, 본인 매력 태그(have), 이상형 매력 태그(want)';

export const CONSENT_OPTIONAL_ITEMS =
  '추가로 어필하고 싶은 매력(기타 매력), 추가로 원하는 이상형(기타 이상형)';

export const CONSENT_RETENTION =
  '수집된 개인정보는 행사 종료일로부터 14일 이내에 지체 없이 파기합니다. 동의 증빙 기록(동의 여부·시각·동의문 버전)은 분쟁 대응을 위해 행사 종료일로부터 1년간 보관한 뒤 파기합니다.';

export const CONSENT_REFUSAL =
  '귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만 동의를 거부할 경우 사전접수 및 매칭에 참여할 수 없습니다.';

export const CONSENT_THIRD_PARTY =
  '매칭 상대에게 학번·이름·전화번호를 제공하지 않습니다. 매칭 결과는 카카오톡 오픈채팅 공지로만 안내합니다.';

export const CONSENT_ENTRUSTMENT =
  '서비스 운영을 위해 클라우드 호스팅(Vercel) 및 데이터베이스(Neon)에 개인정보 처리를 위탁합니다.';

export function buildConsentBody(): string {
  return [
    CONSENT_TITLE,
    `개인정보처리자: ${CONSENT_PROCESSOR}`,
    '',
    'QRious는 「개인정보 보호법」 제15조에 따라 아래와 같이 개인정보를 수집·이용합니다. 내용을 읽으신 후 동의 여부를 결정해 주시기 바랍니다.',
    '',
    '[수집·이용 목적]',
    CONSENT_PURPOSE,
    '',
    '[수집 항목]',
    `필수: ${CONSENT_ITEMS}`,
    `선택: ${CONSENT_OPTIONAL_ITEMS}`,
    '',
    '[보유 및 이용 기간]',
    CONSENT_RETENTION,
    '',
    '[동의 거부 권리 및 불이익]',
    CONSENT_REFUSAL,
    '',
    '[제3자 제공]',
    CONSENT_THIRD_PARTY,
    '',
    '[처리 위탁]',
    CONSENT_ENTRUSTMENT,
  ].join('\n');
}

export const CONSENT_BODY = buildConsentBody();
