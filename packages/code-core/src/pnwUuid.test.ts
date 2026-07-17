import { describe, expect, it } from "vitest";
import { pnwFindUuidOccurrences, pnwIsUuid, pnwNormalizeUuid, pnwReplaceUuidOccurrences } from "./pnwUuid.js";

describe("pnw UUID helpers", () => {
  const lower = "a0b1c2d3-e4f5-4678-9012-3456789abcde";
  const upper = "A0B1C2D3-E4F5-4678-9012-3456789ABCDE";
  const replacement = "11111111-2222-4333-8444-555555555555";

  it("finds UUIDs with editor-friendly positions and ignores larger identifiers", () => {
    const text = `first ${lower}\nsecond ${upper}\nxa0b1c2d3-e4f5-4678-9012-3456789abcdex`;
    expect(pnwFindUuidOccurrences(text)).toEqual([
      { value: lower, normalized: lower.replace(/-/g, ""), kind: "uuid", offset: 6, line: 1, column: 7 },
      { value: upper, normalized: lower.replace(/-/g, ""), kind: "uuid", offset: 50, line: 2, column: 8 },
    ]);
  });

  it("replaces only mapped UUID tokens and matches source UUID case-insensitively", () => {
    const text = `${lower}\n${upper}\n00000000-0000-4000-8000-000000000000`;
    expect(pnwReplaceUuidOccurrences(text, [{ from: lower, to: replacement }])).toBe(
      `${replacement}\n${replacement}\n00000000-0000-4000-8000-000000000000`,
    );
  });

  it("recognizes bare GUID32 tokens and preserves their compact casing on replacement", () => {
    const guid32 = "A0B1C2D3E4F5467890123456789ABCDE";
    const compactTarget = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    expect(pnwFindUuidOccurrences(guid32)).toEqual([{ value: guid32, normalized: guid32.toLowerCase(), kind: "guid32", offset: 0, line: 1, column: 1 }]);
    expect(pnwReplaceUuidOccurrences(guid32, [{ from: guid32, to: compactTarget }])).toBe("ABCDEFABCDEF4ABC8DEFABCDEFABCDEF");
  });

  it("treats a braced dashed UUID as one token and preserves its braces", () => {
    const braced = `{${upper}}`;
    expect(pnwFindUuidOccurrences(braced)).toEqual([{
      value: braced,
      normalized: lower.replace(/-/g, ""),
      kind: "uuid",
      offset: 0,
      line: 1,
      column: 1,
    }]);
    expect(pnwReplaceUuidOccurrences(braced, [{ from: braced, to: replacement }])).toBe(
      `{${replacement.toUpperCase()}}`,
    );
  });

  it("validates mapping values before use", () => {
    expect(pnwIsUuid(lower)).toBe(true);
    expect(pnwIsUuid("not-a-uuid")).toBe(false);
    expect(pnwReplaceUuidOccurrences(lower, [{ from: lower, to: "not-a-uuid" }])).toBe(lower);
  });

  it("matches Desk Tools CAA GUID forms as one token and preserves each form when replacing", () => {
    const cases = [
      {
        source: "0x12345678, 0x1234, 0x1234, {0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef}",
        output: "0xabcdefab, 0xcdef, 0x4abc, {0x8d, 0xef, 0xab, 0xcd, 0xef, 0xab, 0xcd, 0xef}",
      },
      {
        source: "{0x12345678, 0x1234, 0x1234, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef}",
        output: "{0xabcdefab, 0xcdef, 0x4abc, 0x8d, 0xef, 0xab, 0xcd, 0xef, 0xab, 0xcd, 0xef}",
      },
      {
        source: "0x12345678, 0x1234, 0x1234, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef",
        output: "0xabcdefab, 0xcdef, 0x4abc, 0x8d, 0xef, 0xab, 0xcd, 0xef, 0xab, 0xcd, 0xef",
      },
    ];
    for (const { source, output } of cases) {
      const [occurrence] = pnwFindUuidOccurrences(source);
      expect(occurrence).toMatchObject({ kind: "caa-guid", normalized: "12345678123412341234567890abcdef", line: 1, column: 1 });
      expect(pnwIsUuid(source)).toBe(true);
      expect(pnwNormalizeUuid(source)).toBe("12345678123412341234567890abcdef");
      expect(pnwReplaceUuidOccurrences(source, [{ from: source, to: "abcdefab-cdef-4abc-8def-abcdefabcdef" }])).toBe(output);
    }
  });
});
