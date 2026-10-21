import { describe, expect, it } from "vitest";
import { pnwReorderBoundaryWarnings } from "./pnwReorderBoundaryGuard.js";
import { pnwReorderHeaderText } from "./pnwReorderHeader.js";
import { pnwReorderCppText } from "./pnwReorderCpp.js";

describe("reorder boundary guard", () => {
  it.each([
    ["/* clang-format off */", "/* clang-format on */"],
    ["// clang-format off: keep order", "// clang-format on: done"],
  ])("blocks header and source member sorting for unsupported valid clang-format syntax: %s", (start, end) => {
    const header = `class Sample {\npublic:\n${start}\n  void zeta();\n  void alpha();\n${end}\n};\n`;
    const source = `Sample::Sample() {}\n${start}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n${end}\n`;
    expect(pnwReorderHeaderText(header)).toMatchObject({ text: header, changed: false, warnings: expect.arrayContaining([expect.stringContaining("unsupported clang-format")]) });
    expect(pnwReorderCppText(source, "Sample")).toMatchObject({ text: source, changed: false, warnings: expect.arrayContaining([expect.stringContaining("unsupported clang-format")]) });
  });
  it.each([
    ["// clang-format off", "// clang-format on"],
    ["// START KEVIN CAA WIZARD SECTION Sample GET", "// END KEVIN CAA WIZARD SECTION Sample GET"],
    ["// CAA2 WIZARD", "// END CAA2 WIZARD"],
    ["// KEVIN_SYSTEM_CODE START", "// KEVIN_SYSTEM_CODE END"],
    ["#pragma region Methods", "#pragma endregion"],
  ])("accepts pairs, rejects either missing side: %s", (start, end) => {
    expect(pnwReorderBoundaryWarnings(`${start}\nvoid helper();\n${end}\n`)).toEqual([]);
    expect(pnwReorderBoundaryWarnings(`${start}\nvoid helper();\n`).join()).toContain("without a closing boundary");
    expect(pnwReorderBoundaryWarnings(`void helper();\n${end}\n`).join()).toContain("without an opening boundary");
  });

  it("preserves nested and overlapping different protection kinds", () => {
    const nested = "// clang-format off\n// clang-format off\n// CAA2 WIZARD\nint first;\n// END CAA2 WIZARD\n// clang-format on\n// clang-format on\n";
    const overlap = "// clang-format off\n// CAA2 WIZARD\nint first;\n// clang-format on\n// END CAA2 WIZARD\n";
    expect(pnwReorderBoundaryWarnings(nested)).toEqual([]);
    expect(pnwReorderBoundaryWarnings(overlap)).toEqual([]);
  });

  it("rejects incorrectly nested named boundaries of the same kind", () => {
    const source = [
      "// START KEVIN CAA WIZARD SECTION Sample GET", "// START KEVIN CAA WIZARD SECTION Sample SET",
      "int value;", "// END KEVIN CAA WIZARD SECTION Sample GET", "// END KEVIN CAA WIZARD SECTION Sample SET", "",
    ].join("\n");
    expect(pnwReorderBoundaryWarnings(source).join()).toContain("incorrectly nested");
  });

  it("ignores marker lookalikes in literals and block comments", () => {
    const source = 'const char* note = "// clang-format off";\n/*\n// CAA2 WIZARD\n*/\nconst char* raw = R"tag(\n// KEVIN_SYSTEM_CODE START\n)tag";\n';
    expect(pnwReorderBoundaryWarnings(source)).toEqual([]);
  });

  it.each(["R", "u8R", "uR", "UR", "LR"])("allows cpp raw strings but conservatively protects a header raw literal (%s)", prefix => {
    const source = `const char* note = ${prefix}"tag( } \" void fake() { )tag";\n`;
    expect(pnwReorderBoundaryWarnings(source)).toEqual([]);
    expect(pnwReorderBoundaryWarnings(source, { rejectRawLiterals: true }).join()).toContain("raw string literal");
  });

  it("does not mistake commented or normally quoted raw-string text for an actual raw literal", () => {
    const source = '// R"tag( unused )tag"\nconst char* note = "R\\\"tag(text)tag\\\"";\n';
    expect(pnwReorderBoundaryWarnings(source, { rejectRawLiterals: true })).toEqual([]);
  });

  it("rejects unterminated raw literals even for a source parser", () => {
    expect(pnwReorderBoundaryWarnings('const char* note = R"tag( unfinished\n').join()).toContain("raw string literal");
  });

  it("rejects inline markers unsupported by the existing locked-region extractor", () => {
    expect(pnwReorderBoundaryWarnings("void helper() {} // clang-format off\n// clang-format on\n").join()).toContain("outside its own line");
  });

  it.each(["\n", "\r\n", "\r"])("reports the actual missing Wizard terminators in constructor and destructor contexts (%j)", eol => {
    const lines = [
      "Sample::Sample() :",
      "// START KEVIN CAA WIZARD SECTION Sample CMD AGENT CONSTRUCTOR",
      "value_(0)",
      "// end",
      "{}",
      "Sample::~Sample() {",
      "// START KEVIN CAA WIZARD SECTION Sample CMD AGENT DESTRUCTOR",
      "value_ = 0;",
      "}",
    ];
    const source = lines.join(eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings).toEqual([
      "Line 2: preserved source because CAA Wizard has an opening boundary without a closing boundary",
      "Line 7: preserved source because CAA Wizard has an opening boundary without a closing boundary",
    ]);
  });

});
