import { createHash } from 'crypto';
import {
  CONSENT_BODY,
  CONSENT_ITEMS,
  CONSENT_OPTIONAL_ITEMS,
  CONSENT_PROCESSOR,
  CONSENT_PURPOSE,
  CONSENT_REFUSAL,
  CONSENT_RETENTION,
  CONSENT_TITLE,
  CONSENT_VERSION,
} from '@/lib/consent-notice';

export {
  CONSENT_BODY,
  CONSENT_ITEMS,
  CONSENT_OPTIONAL_ITEMS,
  CONSENT_PROCESSOR,
  CONSENT_PURPOSE,
  CONSENT_REFUSAL,
  CONSENT_RETENTION,
  CONSENT_TITLE,
  CONSENT_VERSION,
};

export function hashConsentText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export const CONSENT_HASH = hashConsentText(CONSENT_BODY);
