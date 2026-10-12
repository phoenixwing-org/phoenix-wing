import { describe, expect, it } from "vitest";
import { PNW_INCLUDE_GROUPING_VERSION, pnwGroupCppIncludesText, type PnwTrustedCppHeader } from "./pnwGroupCppIncludes.js";

const enabled = { sortIncludes: true } as const;
const trustedHeaders: PnwTrustedCppHeader[] = [
  { header: "vendor/tool.h", group: "third-party" },
  { header: "sdk/geometry.h", group: "caa-sdk" },
  { header: "local/model.h", group: "project", delimiter: "quote" },
];

describe("optional include grouping", () => {
  it("is off by default, including boundary validation and whitespace changes", () => {
    const source = "\uFEFF// clang-format off\r\n#include <vector>\r\n#include <algorithm>";
    expect(PNW_INCLUDE_GROUPING_VERSION).toBe(1);
    expect(pnwGroupCppIncludesText(source)).toEqual({ text: source, changed: false, warnings: [], usedTrustedHeaders: [] });
    expect(pnwGroupCppIncludesText(source, { sortIncludes: false, trustedHeaders })).toEqual({ text: source, changed: false, warnings: [], usedTrustedHeaders: [] });
  });

  it("uses exact standard names and trusted categories in the fixed four-group order", () => {
    const source = '#include "local/model.h"\n#include <vector>\n#include "sdk/geometry.h"\n#include <vendor/tool.h>\n#include <algorithm>\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders });
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe('#include <algorithm>\n#include <vector>\n\n#include <vendor/tool.h>\n\n#include "sdk/geometry.h"\n\n#include "local/model.h"\n');
    expect(pnwGroupCppIncludesText(result.text, { ...enabled, trustedHeaders }).changed).toBe(false);
  });

  it("recognizes the frozen C++23/C compatibility list without guessing newer or nonstandard headers", () => {
    const source = "#include <vector>\n#include <stdatomic.h>\n#include <flat_map>\n#include <cassert>\n#include <algorithm>\n#include <hive>\n#include <vector>\n#include <array>\n";
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe("#include <algorithm>\n#include <cassert>\n#include <flat_map>\n#include <stdatomic.h>\n#include <vector>\n#include <hive>\n#include <array>\n#include <vector>\n");
  });

  it("keeps unknown angle, quoted standard and prefix-looking headers as anchors", () => {
    const source = '#include <vector>\n#include <algorithm>\n#include "vector"\n#include <vector>\n#include <array>\n#include <CATExample.h>\n#include "std/custom.h"\n#include <vendor/unknown.h>\n';
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe('#include <algorithm>\n#include <vector>\n#include "vector"\n#include <array>\n#include <vector>\n#include <CATExample.h>\n#include "std/custom.h"\n#include <vendor/unknown.h>\n');
  });

  it("uses an explicit quoted project resolution even when the header spelling is a standard name", () => {
    const source = '#include "vector"\n#include <vector>\n#include <array>\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [{ header: "vector", group: "project", delimiter: "quote" }] });
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe('#include <array>\n#include <vector>\n\n#include "vector"\n');
  });

  it("reports contradictory trusted and standard classifications without moving the ambiguous include", () => {
    const source = "#include <vector>\n#include <algorithm>\n";
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [{ header: "vector", group: "project" }] });
    expect(result.text).toBe(source);
    expect(result.warnings.join()).toContain("ambiguous header classification");
  });

  it("reports conflicting exact trusted mappings and does not guess", () => {
    const source = '#include "local/model.h"\n#include <vector>\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [
      { header: "local/model.h", group: "project" }, { header: "local/model.h", group: "third-party" },
    ] });
    expect(result.text).toBe(source);
    expect(result.warnings).toHaveLength(1);
  });

  it("sorts within nested conditional branches without crossing any directive", () => {
    const source = [
      "#if FIRST", "#include <vector>", "#include <array>", "#ifdef INNER", "#include <string>", "#include <algorithm>",
      "#elif OTHER", "#include <vector>", "#include <array>", "#else", "#include <string>", "#include <algorithm>",
      "#endif", "#else", "#include <vector>", "#include <array>", "#endif", "",
    ].join("\n");
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe(source.replaceAll("#include <vector>\n#include <array>", "#include <array>\n#include <vector>")
      .replaceAll("#include <string>\n#include <algorithm>", "#include <algorithm>\n#include <string>"));
  });

  it.each([
    "#define MODE 1", "#undef MODE", "#pragma warning(push)", "#include_next <vector>", "#import <vector>",
    "#include HEADER_NAME", "REGISTER_MODULE(Sample);", "int declaration;",
  ])("treats other directives and declarations as fixed run boundaries: %s", barrier => {
    const source = `#include <vector>\n${barrier}\n#include <array>\n`;
    expect(pnwGroupCppIncludesText(source, enabled)).toEqual({ text: source, changed: false, warnings: [], usedTrustedHeaders: [] });
  });

  it("does not detach TIE headers, their registration, or their leading note even when trusted", () => {
    const source = '#include <vector>\n#include <array>\n// Interface registration\n#include "sdk/TIE_Sample.h"\nTIE_Sample(Implementation);\n#include <vector>\n#include <algorithm>\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [{ header: "sdk/TIE_Sample.h", group: "caa-sdk" }] });
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe('#include <array>\n#include <vector>\n// Interface registration\n#include "sdk/TIE_Sample.h"\nTIE_Sample(Implementation);\n#include <algorithm>\n#include <vector>\n');
  });

  it("moves trailing comments with their include and preserves duplicate order", () => {
    const source = "  # include <vector> // vector first\n#include <array> /* array note */\n#include <vector> // vector second\n";
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe("#include <array> /* array note */\n  # include <vector> // vector first\n#include <vector> // vector second\n");
    expect(result.text.match(/include <vector>/g)).toHaveLength(2);
  });

  it.each(["// A section note", "/* A section note */", "/*\n * A section note\n */"])("anchors standalone comments and their next include: %s", note => {
    const source = `#include <vector>\n${note}\n#include <string>\n#include <vector>\n#include <array>\n`;
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.text).toBe(`#include <vector>\n${note}\n#include <string>\n#include <array>\n#include <vector>\n`);
  });

  it.each([
    ["// clang-format off", "// clang-format on"],
    ["// START KEVIN CAA WIZARD SECTION Sample", "// END KEVIN CAA WIZARD SECTION Sample"],
    ["// CAA2 WIZARD", "// END CAA2 WIZARD"],
    ["// KEVIN_SYSTEM_CODE START", "// KEVIN_SYSTEM_CODE END"],
    ["#pragma region Generated", "#pragma endregion"],
  ])("preserves complete protected include groups: %s", (start, end) => {
    const locked = `${start}\n#include <vector>\n#include <array>\n${end}\n`;
    const result = pnwGroupCppIncludesText(`${locked}#include <vector>\n#include <array>\n`, enabled);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe(`${locked}#include <array>\n#include <vector>\n`);
  });

  it.each(["// clang-format off", "#if FEATURE", "#else", "#endif"])("returns all text unchanged when safety boundaries are incomplete: %s", prefix => {
    const source = `${prefix}\n#include <vector>\n#include <array>\n`;
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("rejects an elif or duplicate else after an else", () => {
    const source = "#if FEATURE\n#else\n#elif OTHER\n#include <vector>\n#include <array>\n#endif\n";
    expect(pnwGroupCppIncludesText(source, enabled)).toMatchObject({ text: source, changed: false, warnings: [expect.stringContaining("follows #else")] });
  });

  it("ignores include-looking lines inside raw strings and block comments", () => {
    const prefix = 'const char* example = R"tag(\n#include <vector>\n#include <array>\n)tag";\n/*\n#include <vector>\n#include <array>\n*/\n\n';
    const result = pnwGroupCppIncludesText(`${prefix}#include <vector>\n#include <array>\n`, enabled);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe(`${prefix}#include <array>\n#include <vector>\n`);
  });

  it("never rearranges include-looking text inside an unterminated block comment", () => {
    const source = "/*\n#include <vector>\n#include <string>\n#include <array>\n";
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.text).toBe(source);
    expect(result.warnings.join()).toContain("block comment is unterminated");
  });

  it("does not sort macro continuation contents or a line-spliced comment", () => {
    const prefix = '#define CONTENT \\\n#include <vector> \\\n#include <array>\n// A continued comment \\\n#include <string>\n';
    const result = pnwGroupCppIncludesText(`${prefix}#include <vector>\n#include <array>\n`, enabled);
    expect(result.text).toBe(`${prefix}#include <array>\n#include <vector>\n`);
  });

  it.each(["\n", "\r\n", "\r"])("preserves BOM, newline style and EOF convention (%j)", eol => {
    for (const ending of ["", eol]) {
      const source = `\uFEFF#include <vector>${eol}#include <array>${ending}`;
      const result = pnwGroupCppIncludesText(source, enabled);
      expect(result.text).toBe(`\uFEFF#include <array>${eol}#include <vector>${ending}`);
      expect(pnwGroupCppIncludesText(result.text, enabled).changed).toBe(false);
    }
  });

  it("keeps mixed newline slots rather than concatenating an EOF include into its neighbor", () => {
    const result = pnwGroupCppIncludesText("#include <vector>\r\n#include <string>\n#include <array>", enabled);
    expect(result.text).toBe("#include <array>\r\n#include <string>\n#include <vector>");
    expect(pnwGroupCppIncludesText(result.text, enabled).changed).toBe(false);
  });

  it("does not rewrite header spelling, delimiters or surrounding source", () => {
    const source = '// File title\n\n#include "local\\model.h"\n#include <vector>\n\nvoid untouched() {  work(); }\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [{ header: "local\\model.h", group: "project" }] });
    expect(result.text).toBe('// File title\n\n#include <vector>\n\n#include "local\\model.h"\n\nvoid untouched() {  work(); }\n');
  });

  it("returns a warning rather than using a malformed trusted category", () => {
    const source = '#include "local/model.h"\n#include <vector>\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [{ header: "local/model.h", group: "guessed" as PnwTrustedCppHeader["group"] }] });
    expect(result.text).toBe(source);
    expect(result.warnings.join()).toContain("classification is invalid");
  });

  it.each([
    ["/* clang-format off */", "/* clang-format on */"],
    ["// clang-format off: preserve dependencies", "// clang-format on: done"],
  ])("preserves all source for valid clang-format markers not yet owned by the range parser: %s", (start, end) => {
    const source = `${start}\n#include <vector>\n#include <string>\n#include <array>\n${end}\n`;
    const result = pnwGroupCppIncludesText(source, enabled);
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.usedTrustedHeaders).toEqual([]);
    expect(result.warnings.join()).toContain("unsupported clang-format protection syntax");
  });

  it("reports only exact trusted rules from runs that actually changed", () => {
    const first = { header: "local/first.h", group: "project" as const, delimiter: "quote" as const };
    const second = { header: "local/second.h", group: "project" as const, delimiter: "quote" as const };
    const tie = { header: "TIE_Sample.h", group: "caa-sdk" as const };
    const source = '#include "local/first.h"\n#include <vector>\n#include "unknown.h"\n#include <array>\n\n#include "local/second.h"\n#include "TIE_Sample.h"\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [first, second, tie, { header: "unused.h", group: "project" }] });
    expect(result.warnings).toEqual([]);
    expect(result.usedTrustedHeaders).toEqual([first]);
    expect(pnwGroupCppIncludesText(result.text, { ...enabled, trustedHeaders: [first, second, tie] }).usedTrustedHeaders).toEqual([]);
  });

  it("deduplicates exact used rules without mutating supplied metadata", () => {
    const rule = Object.freeze({ header: "local/model.h", group: "project" as const, delimiter: "quote" as const });
    const source = '#include "local/model.h"\n#include <vector>\n#include "local/model.h"\n';
    const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders: [rule, rule] });
    expect(result.usedTrustedHeaders).toEqual([rule]);
    expect(result.usedTrustedHeaders[0]).not.toBe(rule);
    expect(result.text.match(/local\/model.h/g)).toHaveLength(2);
  });

  it("preserves every nonblank source line and converges across ordering and grouping combinations", () => {
    const entries = ['#include "local/model.h"', '#include <vector> // first copy', '#include "sdk/geometry.h"', '#include <vendor/tool.h>', '#include <vector> // second copy'];
    for (let rotation = 0; rotation < entries.length; rotation += 1) {
      const rotated = [...entries.slice(rotation), ...entries.slice(0, rotation)];
      for (const eol of ["\n", "\r\n", "\r"]) {
        const source = ["// File heading", "", ...rotated, "", '#include "unknown.h"', ...[...rotated].reverse(), "void unchanged();"].join(eol);
        const result = pnwGroupCppIncludesText(source, { ...enabled, trustedHeaders });
        const substantiveLines = (text: string) => text.split(/\r\n|\r|\n/).filter(line => line.trim()).sort();
        expect(result.warnings).toEqual([]);
        expect(substantiveLines(result.text)).toEqual(substantiveLines(source));
        expect(pnwGroupCppIncludesText(result.text, { ...enabled, trustedHeaders }).changed).toBe(false);
      }
    }
  });
});
