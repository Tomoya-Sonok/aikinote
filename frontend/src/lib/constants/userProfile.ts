export const AGE_RANGE_OPTIONS = [
  "lt20",
  "20s",
  "30s",
  "40s",
  "50s",
  "gt60",
] as const;
export type AgeRange = (typeof AGE_RANGE_OPTIONS)[number];

export const GENDER_OPTIONS = [
  "male",
  "female",
  "other",
  "not_specified",
] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];
