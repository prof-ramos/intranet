export interface CreateEnumMetadataConfig<T extends string> {
  values: readonly T[];
  labels: Record<T, string>;
  badges?: Partial<Record<T, string>>;
  defaultBadge?: string;
}

export interface EnumMetadata<T extends string> {
  STATUSES: readonly T[];
  LABELS: Record<T, string>;
  OPTIONS: readonly { value: T; label: string }[];
  isStatus: (value: string) => value is T;
  getLabel: (value: string) => string;
  getBadgeClass: (value: string) => string;
}

export function createEnumMetadata<T extends string>(
  config: CreateEnumMetadataConfig<T>,
): EnumMetadata<T> {
  const { values, labels, badges = {}, defaultBadge = '' } = config;

  const STATUSES = values;
  const LABELS = labels;
  const OPTIONS = values.map((v) => ({ value: v, label: labels[v] })) as readonly {
    value: T;
    label: string;
  }[];

  function isStatus(value: string): value is T {
    return (values as readonly string[]).includes(value);
  }

  function getLabel(value: string): string {
    if (isStatus(value)) return labels[value];
    return value;
  }

  function getBadgeClass(value: string): string {
    if (isStatus(value)) {
      return (badges as Record<string, string | undefined>)[value] ?? defaultBadge;
    }
    return defaultBadge;
  }

  return { STATUSES, LABELS, OPTIONS, isStatus, getLabel, getBadgeClass };
}
