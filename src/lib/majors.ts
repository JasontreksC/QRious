export type Major = {
  major_id: string;
  name: string;
  short_name: string;
};

export function sortMajors(majors: Major[]): Major[] {
  return [...majors].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}
