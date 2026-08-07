export type LabelExtractor<T> = (record: T) => string | number | null | undefined;

export function buildLabelMap<T>(records: T[], idSelector: LabelExtractor<T>, labelSelector: LabelExtractor<T>) {
  const map = new Map<string, string>();
  records.forEach((record) => {
    const id = idSelector(record);
    if (id == null) return;
    const label = labelSelector(record);
    map.set(String(id), label == null ? String(id) : String(label));
  });
  return map;
}

export function createLabelResolver(map: Map<string, string>, fallback = "-") {
  return (id: string | null | undefined) => {
    if (!id) return fallback;
    return map.get(String(id)) ?? fallback;
  };
}
