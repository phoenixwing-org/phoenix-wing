export type PnwUuidKind = "uuid" | "guid32" | "caa-guid";

export type PnwUuidOccurrence = {
  readonly value: string;
  /** Lowercase 32-hex identity shared by dashed, compact and CAA GUID forms. */
  readonly normalized: string;
  readonly kind: PnwUuidKind;
  readonly offset: number;
  readonly line: number;
  readonly column: number;
};

export type PnwUuidReplacement = {
  readonly from: string;
  readonly to: string;
};

type PnwCaaGuidStyle = "nested" | "flat_brace" | "flat_run";

const PNW_STANDARD_UUID_PATTERN = /\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})\b/gi;
const PNW_CAA_BYTE_PATTERN = "0x([0-9a-f]{2})";
const PNW_CAA_BYTES_PATTERN = Array.from({ length: 8 }, () => PNW_CAA_BYTE_PATTERN).join("\\s*,\\s*");
const PNW_CAA_GUID_SPECS: readonly { readonly style: PnwCaaGuidStyle; readonly source: string }[] = [
  { style: "nested", source: "0x([0-9a-f]{8})\\s*,\\s*0x([0-9a-f]{4})\\s*,\\s*0x([0-9a-f]{4})\\s*,\\s*\\{\\s*" + PNW_CAA_BYTES_PATTERN + "\\s*\\}" },
  { style: "flat_brace", source: "\\{\\s*0x([0-9a-f]{8})\\s*,\\s*0x([0-9a-f]{4})\\s*,\\s*0x([0-9a-f]{4})\\s*,\\s*" + PNW_CAA_BYTES_PATTERN + "\\s*\\}" },
  { style: "flat_run", source: "0x([0-9a-f]{8})\\s*,\\s*0x([0-9a-f]{4})\\s*,\\s*0x([0-9a-f]{4})\\s*,\\s*" + PNW_CAA_BYTES_PATTERN + "(?!\\s*,\\s*0x|\\s*\\})" },
];

/** Returns UUID-like tokens with a cross-format normalized identity and editor positions. */
export function pnwFindUuidOccurrences(text: string): readonly PnwUuidOccurrence[] {
  const candidates: Array<{ value: string; normalized: string; kind: PnwUuidKind; offset: number }> = [];
  const spans: Array<readonly [number, number]> = [];
  for (const spec of PNW_CAA_GUID_SPECS) {
    const pattern = new RegExp(spec.source, "gis");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const value = match[0];
      candidates.push({ value, normalized: pnwCaaGuidGroupsToNormalized(match.slice(1)), kind: "caa-guid", offset: match.index });
      spans.push([match.index, match.index + value.length]);
    }
  }
  for (const match of text.matchAll(PNW_STANDARD_UUID_PATTERN)) {
    const value = match[0];
    const offset = match.index ?? 0;
    if (pnwOverlaps(offset, offset + value.length, spans)) continue;
    candidates.push({ value, normalized: pnwNormalizeUuid(value), kind: value.includes("-") ? "uuid" : "guid32", offset });
  }
  candidates.sort((left, right) => left.offset - right.offset);
  const lineStarts = pnwLineStarts(text);
  return candidates.map((candidate) => {
    const lineIndex = pnwLineIndex(lineStarts, candidate.offset);
    return { ...candidate, line: lineIndex + 1, column: candidate.offset - lineStarts[lineIndex]! + 1 };
  });
}

/** Replaces exact UUID tokens according to a cross-format, case-insensitive mapping. */
export function pnwReplaceUuidOccurrences(text: string, replacements: readonly PnwUuidReplacement[]): string {
  const normalized = new Map<string, string>();
  for (const replacement of replacements) {
    if (!pnwIsUuid(replacement.from) || !pnwIsUuid(replacement.to)) continue;
    normalized.set(pnwNormalizeUuid(replacement.from), replacement.to);
  }
  if (!normalized.size) return text;
  const occurrences = pnwFindUuidOccurrences(text);
  let output = text;
  for (const occurrence of [...occurrences].reverse()) {
    const replacement = normalized.get(occurrence.normalized);
    if (!replacement) continue;
    output = output.slice(0, occurrence.offset) + pnwFormatUuidForTemplate(occurrence.value, replacement) + output.slice(occurrence.offset + occurrence.value.length);
  }
  return output;
}

/** Validates a dashed UUID, compact GUID32 or CAA `0x…` GUID token. */
export function pnwIsUuid(value: string): boolean {
  const text = value.trim();
  const unbraced = text.startsWith("{") && text.endsWith("}") ? text.slice(1, -1).trim() : text;
  if (/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$/i.test(unbraced)) return true;
  return pnwParseCaaGuid(text) !== undefined;
}

/** Normalizes supported UUID spellings to lowercase 32 hexadecimal characters. */
export function pnwNormalizeUuid(value: string): string {
  const caa = pnwParseCaaGuid(value);
  if (caa) return caa.normalized;
  return value.trim().replace(/^\{/, "").replace(/\}$/, "").replace(/-/g, "").toLocaleLowerCase();
}

/** Formats a replacement UUID with the spelling, case and CAA layout of a source token. */
export function pnwFormatUuidForTemplate(template: string, replacement: string): string {
  if (!pnwIsUuid(template) || !pnwIsUuid(replacement)) return template;
  return pnwFormatUuidLike(template, replacement);
}

function pnwParseCaaGuid(value: string): { readonly style: PnwCaaGuidStyle; readonly normalized: string } | undefined {
  for (const spec of PNW_CAA_GUID_SPECS) {
    const match = new RegExp(`^${spec.source}$`, "is").exec(value.trim());
    if (match) return { style: spec.style, normalized: pnwCaaGuidGroupsToNormalized(match.slice(1)) };
  }
  return undefined;
}

function pnwCaaGuidGroupsToNormalized(groups: readonly string[]): string {
  return groups.slice(0, 11).join("").toLocaleLowerCase();
}

function pnwFormatUuidLike(template: string, replacement: string): string {
  const caa = pnwParseCaaGuid(template);
  const normalized = pnwNormalizeUuid(replacement);
  const sourceUsesUppercase = /[A-F]/.test(template);
  if (caa) return pnwFormatCaaGuid(normalized, caa.style, sourceUsesUppercase, template);
  const sourceUsesHyphens = template.includes("-");
  let output = sourceUsesHyphens
    ? `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`
    : normalized;
  if (sourceUsesUppercase) output = output.toUpperCase();
  return output;
}

function pnwFormatCaaGuid(normalized: string, style: PnwCaaGuidStyle, useUppercase: boolean, template: string): string {
  const hex = useUppercase ? normalized.toUpperCase() : normalized;
  const bytes = Array.from({ length: 8 }, (_, index) => hex.slice(16 + index * 2, 18 + index * 2));
  const byteList = bytes.map((byte) => `0x${byte}`).join(", ");
  const d1 = hex.slice(0, 8);
  const d2 = hex.slice(8, 12);
  const d3 = hex.slice(12, 16);
  if (style === "flat_brace") return `{0x${d1}, 0x${d2}, 0x${d3}, ${byteList}}`;
  if (style === "flat_run") return `0x${d1}, 0x${d2}, 0x${d3}, ${byteList}`;
  if (template.includes("\n")) {
    const indent = /\n(\s+)0x/.exec(template)?.[1] ?? "                 ";
    return `0x${d1},\n${indent}0x${d2},\n${indent}0x${d3},\n${indent}{${byteList}}`;
  }
  return `0x${d1}, 0x${d2}, 0x${d3}, {${byteList}}`;
}

function pnwOverlaps(start: number, end: number, spans: readonly (readonly [number, number])[]): boolean {
  return spans.some(([left, right]) => !(end <= left || start >= right));
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
