/** 개인정보 보호법 필수 고지 항목을 담은 동의문 (버전 관리). */

export const CONSENT_VERSION = '2026.09.15-1';

export const CONSENT_TITLE = '개인정보 수집·이용 동의서';

export const CONSENT_PROCESSOR = 'QRious 운영팀';

export const CONSENT_PURPOSE =
  'QR 소개팅 사전접수 접수 확인, 참가자 식별, 매칭 수행 및 행사 안내 연락';

export const CONSENT_ITEMS =
  '학과, 이름, 전화번호, 성별, 나이, 선호 연령 조건, MBTI, 본인 매력 태그(have), 이상형 매력 태그(want)';

export const CONSENT_OPTIONAL_ITEMS =
  '추가로 적어 주시는 자기소개(매력·취미·좋아하는 것 등), 추가로 적어 주시는 이상형(취미·취향 등)';

export const CONSENT_RETENTION =
  '수집된 개인정보는 행사 종료일로부터 14일 이내에 지체 없이 파기합니다. 동의 증빙 기록(동의 여부·시각·동의문 버전)은 분쟁 대응을 위해 행사 종료일로부터 1년간 보관한 뒤 파기합니다.';

export const CONSENT_REFUSAL =
  '귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만 동의를 거부할 경우 사전접수 및 매칭에 참여할 수 없습니다.';

export const CONSENT_ENTRUSTMENT =
  '서비스 운영을 위해 클라우드 호스팅(Vercel) 및 데이터베이스(Neon)에 개인정보 처리를 위탁합니다.';

export const CONSENT_THIRD_PARTY_NOTE =
  '매칭된 상대 참가자에게 이름·전화번호를 제공하는 사항은 「개인정보 제3자 제공 동의서」에서 별도로 동의를 받습니다.';

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
    CONSENT_THIRD_PARTY_NOTE,
    '',
    '[처리 위탁]',
    CONSENT_ENTRUSTMENT,
  ].join('\n');
}

export const CONSENT_BODY = buildConsentBody();

export const THIRD_PARTY_CONSENT_VERSION = '2026.09.09-3-tp';

export const THIRD_PARTY_CONSENT_TITLE = '개인정보 제3자 제공 동의서';

export const THIRD_PARTY_RECIPIENT = '본 행사에서 매칭된 상대 참가자';

export const THIRD_PARTY_PURPOSE =
  '매칭 이후 상호 연락 및 만남 일정 조율';

export const THIRD_PARTY_ITEMS = '이름, 전화번호';

export const THIRD_PARTY_OPTIONAL_ITEMS = '없음';

export const THIRD_PARTY_RETENTION =
  '제공받은 상대 참가자는 행사 종료일로부터 14일 이내에 제공받은 개인정보를 파기합니다.';

export const THIRD_PARTY_REFUSAL =
  '귀하는 개인정보 제3자 제공에 대한 동의를 거부할 권리가 있습니다. 다만 동의를 거부할 경우 매칭에 참여할 수 없습니다.';

export function buildThirdPartyConsentBody(): string {
  return [
    THIRD_PARTY_CONSENT_TITLE,
    `개인정보처리자: ${CONSENT_PROCESSOR}`,
    '',
    'QRious는 「개인정보 보호법」 제17조에 따라 아래와 같이 개인정보를 제3자에게 제공합니다. 내용을 읽으신 후 동의 여부를 결정해 주시기 바랍니다.',
    '',
    '[제공받는 자]',
    THIRD_PARTY_RECIPIENT,
    '',
    '[제공받는 자의 이용 목적]',
    THIRD_PARTY_PURPOSE,
    '',
    '[제공하는 개인정보 항목]',
    `필수: ${THIRD_PARTY_ITEMS}`,
    `선택: ${THIRD_PARTY_OPTIONAL_ITEMS}`,
    '',
    '[제공받는 자의 보유 및 이용 기간]',
    THIRD_PARTY_RETENTION,
    '',
    '[동의 거부 권리 및 불이익]',
    THIRD_PARTY_REFUSAL,
  ].join('\n');
}

export const THIRD_PARTY_CONSENT_BODY = buildThirdPartyConsentBody();

export function isThirdPartyConsentVersion(version: string): boolean {
  return version.endsWith('-tp');
}
