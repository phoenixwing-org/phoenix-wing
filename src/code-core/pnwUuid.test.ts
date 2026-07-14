import { describe, expect, it } from "vitest";
import { pnwFindUuidOccurrences, pnwIsUuid, pnwReplaceUuidOccurrences } from "./pnwUuid.js";

describe("pnw UUID helpers", () => {
  const lower = "a0b1c2d3-e4f5-4678-9012-3456789abcde";
  const upper = "A0B1C2D3-E4F5-4678-9012-3456789ABCDE";
  const replacement = "11111111-2222-4333-8444-555555555555";

  it("finds UUIDs with editor-friendly positions and ignores larger identifiers", () => {
    const text = `first ${lower}\nsecond ${upper}\nxa0b1c2d3-e4f5-4678-9012-3456789abcdex`;
    expect(pnwFindUuidOccurrences(text)).toEqual([
      { value: lower, offset: 6, line: 1, column: 7 },
      { value: upper, offset: 50, line: 2, column: 8 },
    ]);
  });

  it("replaces only mapped UUID tokens and matches source UUID case-insensitively", () => {
    const text = `${lower}\n${upper}\n00000000-0000-4000-8000-000000000000`;
    expect(pnwReplaceUuidOccurrences(text, [{ from: lower, to: replacement }])).toBe(
      `${replacement}\n${replacement}\n00000000-0000-4000-8000-000000000000`,
    );
  });

  it("validates mapping values before use", () => {
    expect(pnwIsUuid(lower)).toBe(true);
    expect(pnwIsUuid("not-a-uuid")).toBe(false);
    expect(pnwReplaceUuidOccurrences(lower, [{ from: lower, to: "not-a-uuid" }])).toBe(lower);
  });
});
