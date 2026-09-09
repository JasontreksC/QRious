export const AGE_PREF_ANY = 'any' as const;

export const AGE_PREF_SPECIFIC = [
  { age_pref_id: 'younger', name: '연하' },
  { age_pref_id: 'same', name: '동갑' },
  { age_pref_id: 'older', name: '연상' },
] as const;

export type AgePrefSpecificId = (typeof AGE_PREF_SPECIFIC)[number]['age_pref_id'];

export const AGE_PREF_SPECIFIC_IDS = new Set<string>(
  AGE_PREF_SPECIFIC.map((item) => item.age_pref_id)
);

export function parseAgePrefIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = [
    ...new Set(
      value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    ),
  ];
  if (ids.includes(AGE_PREF_ANY)) {
    return ids.length === 1 ? [AGE_PREF_ANY] : null;
  }
  if (ids.every((id) => AGE_PREF_SPECIFIC_IDS.has(id))) return ids;
  return null;
}
