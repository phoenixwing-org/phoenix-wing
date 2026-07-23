import { describe, expect, it } from "vitest";
import {
  pnwCodeReplaceStringByRules,
  pnwCodeReplaceTextByRules,
  pnwCodeResolveReplacementRules,
  pnwCodeSuggestNameReplacement,
} from "./pnwCodeReplacementRules.js";

describe("code replacement rules", () => {
  it("uses the longest match and preserves declared summary order", () => {
    const rules = pnwCodeResolveReplacementRules([
      { id: "short", search: "Auto", replace: "Tom" },
      { id: "long", search: "AutoCode", replace: "Done" },
    ]);
    expect(pnwCodeReplaceStringByRules("AutoCode Auto", rules)).toEqual({
      output: "Done Tom",
      matches: [
        { ruleId: "short", search: "Auto", replace: "Tom", occurrences: 1 },
        { ruleId: "long", search: "AutoCode", replace: "Done", occurrences: 1 },
      ],
    });
  });

  it("deduplicates, rejects conflicting rules and derives uppercase rules", () => {
    expect(pnwCodeResolveReplacementRules([
      { search: "Old", replace: "New" }, { search: "Old", replace: "New" },
    ])).toHaveLength(1);
    expect(() => pnwCodeResolveReplacementRules([
      { search: "Old", replace: "One" }, { search: "Old", replace: "Two" },
    ])).toThrow("搜索规则冲突");
    const upper = pnwCodeResolveReplacementRules([{ id: "name", search: "Old", replace: "New" }], true);
    expect(pnwCodeReplaceStringByRules("OLD Old", upper).output).toBe("NEW New");
  });

  it("projects distinct one-based lines and total occurrences", () => {
    const rules = pnwCodeResolveReplacementRules([{ search: "Old", replace: "New" }]);
    expect(pnwCodeReplaceTextByRules("Old Old\r\nkeep\nOld", rules)).toMatchObject({
      output: "New New\r\nkeep\nNew", occurrences: 3, lines: [1, 3],
    });
  });

  it("returns a display-only name suggestion", () => {
    expect(pnwCodeSuggestNameReplacement("OldPanel.cpp", [{ search: "Old", replace: "New" }]))
      .toMatchObject({ currentName: "OldPanel.cpp", suggestedName: "NewPanel.cpp" });
    expect(pnwCodeSuggestNameReplacement("Keep.cpp", [{ search: "Old", replace: "New" }])).toBeUndefined();
  });
});
