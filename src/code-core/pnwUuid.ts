export type PnwUuidOccurrence = {
  readonly value: string;
  readonly offset: number;
  readonly line: number;
  readonly column: number;
};

export type PnwUuidReplacement = {
  readonly from: string;
  readonly to: string;
};

const PNW_UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Returns canonical UUID occurrences with zero-based text offsets and one-based editor positions. */
export function pnwFindUuidOccurrences(text: string): readonly PnwUuidOccurrence[] {
  const occurrences: PnwUuidOccurrence[] = [];
  const lineStarts = pnwLineStarts(text);
  for (const match of text.matchAll(PNW_UUID_PATTERN)) {
    const offset = match.index ?? 0;
    const lineIndex = pnwLineIndex(lineStarts, offset);
    occurrences.push({
      value: match[0],
      offset,
      line: lineIndex + 1,
      column: offset - lineStarts[lineIndex]! + 1,
    });
  }
  return occurrences;
}

/** Replaces exact UUID tokens according to a case-insensitive mapping. Invalid mappings are ignored. */
export function pnwReplaceUuidOccurrences(text: string, replacements: readonly PnwUuidReplacement[]): string {
  const normalized = new Map<string, string>();
  for (const replacement of replacements) {
    if (!pnwIsUuid(replacement.from) || !pnwIsUuid(replacement.to)) continue;
    normalized.set(replacement.from.toLocaleLowerCase(), replacement.to);
  }
  if (!normalized.size) return text;
  return text.replace(PNW_UUID_PATTERN, (value) => normalized.get(value.toLocaleLowerCase()) ?? value);
}

/** Validates the common 8-4-4-4-12 UUID representation without constraining the UUID version. */
export function pnwIsUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function pnwLineStarts(text: string): readonly number[] {
  const starts = [0];
  for (let index = text.indexOf("\n"); index >= 0; index = text.indexOf("\n", index + 1)) starts.push(index + 1);
  return starts;
}

function pnwLineIndex(starts: readonly number[], offset: number): number {
  let lower = 0;
  let upper = starts.length - 1;
  while (lower < upper) {
    const middle = Math.ceil((lower + upper) / 2);
    if (starts[middle]! <= offset) lower = middle;
    else upper = middle - 1;
  }
  return lower;
}
