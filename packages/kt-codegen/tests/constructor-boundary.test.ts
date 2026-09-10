// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { KtCodegenController, KtCodegenItem } from "../src/index.js";

const start = "// START KEVIN CAA WIZARD SECTION Sample PARAM CONSTRUCTOR";
const end = "// END KEVIN CAA WIZARD SECTION Sample PARAM CONSTRUCTOR";

function generate(text: string) {
  const controller = new KtCodegenController();
  controller.param.namePrefix = "S";
  controller.param.nameMiddle = "amp";
  controller.param.items.push(new KtCodegenItem({ nameSuffix: "le", id: 1, paramString: "first", dataType: "int", defaultValue: "0" }));
  const plan = controller.analyze({
    targets: ["cpp.parameter"], blockKeys: ["PARAM CONSTRUCTOR"],
    snapshot: { files: [{ path: "Sample.cpp", text, fingerprint: "fixture:constructor" }] },
  });
  expect(plan.canApply, JSON.stringify(plan.diagnostics)).toBe(true);
  expect(plan.artifacts).toHaveLength(1);
  const region = plan.markerRegions[0]!;
  const output = text.slice(0, region.replaceStartOffset) + plan.artifacts[0]!.content + text.slice(region.replaceEndOffset);
  expect(output.slice(output.indexOf(end) + end.length)).toBe(text.slice(text.indexOf(end) + end.length));
  return output;
}

describe("constructor END / clang-format boundary (rules 1.0.1)", () => {
  it.each(["\n", "\r\n"])("matches the two minimal complete-output cases with EOL %j", eol => {
    for (const [tail, oldPrefix, expectedPrefix] of [
      ["    , tail(0) {\n}\n", "", "    "],
      ["{\n}\n", "    ", ""],
    ]) {
      const input = `Sample::Sample()\n    ${start}\n\n    // clang-format off\n    : first(0) // 1\n\n${oldPrefix}// clang-format on\n${oldPrefix}${end}\n${tail}`.replaceAll("\n", eol);
      const expected = `Sample::Sample()\n    ${start}\n\n    // clang-format off\n    : first(0) // 1\n\n${expectedPrefix}// clang-format on\n${expectedPrefix}${end}\n${tail}`.replaceAll("\n", eol);
      const output = generate(input);
      expect(output).toBe(expected);
      expect(generate(output)).toBe(output); // Repeated generation is stable.
    }
  });

  it.each([
    { tail: "\n// explanation\n    , tail(0) {}\n", prefix: "    " },
    { tail: "  /* multiline\n    note\n  */\n\n{\n}\n", prefix: "" },
    { tail: "\t/* inline */ , tail(0) {}\n", prefix: "\t" },
    { tail: "  { // body only\n  }\n", prefix: "  " },
    { tail: "\t, tail(0) {}\n", prefix: "\t" },
  ])("follows semantic source indentation without rewriting the tail: $tail", ({ tail, prefix }) => {
    const output = generate(`Sample::Sample()\n    ${start}\nold\n${end}\n${tail}`);
    expect(output).toContain(`\n${prefix}// clang-format on\n${prefix}${end}\n${tail}`);
  });

  it.each(["", "\n// trailing note\n", "\n/* trailing note */\n"])("preserves existing END whitespace when no semantic tail exists: %j", tail => {
    const output = generate(`Sample::Sample()\n    ${start}\nold\n\t${end}${tail}`);
    expect(output).toContain(`\n\t// clang-format on\n\t${end}${tail}`);
  });
});
