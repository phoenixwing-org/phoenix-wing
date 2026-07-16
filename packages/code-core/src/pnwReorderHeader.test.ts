import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  pnwExtractLockedRegionContents,
  pnwFindLockedRegions,
  pnwReorderHeaderText,
} from "./pnwReorderHeader.js";

const fixtureRoot = fileURLToPath(new URL("./fixtures/", import.meta.url));

function fixture(name: string): string {
  return fs.readFileSync(path.join(fixtureRoot, name), "utf8");
}

describe("reorderHeaderEngine", () => {
  it("orders special members and methods while keeping member slots stable", () => {
    const source = [
      "class ExportedByModule Sample final {",
      "public:",
      "    void zeta();",
      "    int zebraMember;",
      "    Sample(int value);",
      "    ~Sample();",
      "    Sample();",
      "    void alpha();",
      "    int appleMember;",
      "};",
      "",
    ].join("\n");

    const result = pnwReorderHeaderText(source);
    expect(result.changed).toBe(true);
    expect(result.text.indexOf("Sample();")).toBeLessThan(result.text.indexOf("Sample(int value)"));
    expect(result.text.indexOf("Sample(int value)")).toBeLessThan(result.text.indexOf("~Sample()"));
    expect(result.text.indexOf("alpha()")).toBeLessThan(result.text.indexOf("zeta()"));
    expect(result.text.indexOf("zebraMember")).toBeLessThan(result.text.indexOf("appleMember"));
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);

    const sortedMembers = pnwReorderHeaderText(source, { sortMembers: true });
    expect(sortedMembers.text.indexOf("appleMember")).toBeLessThan(sortedMembers.text.indexOf("zebraMember"));
  });

  it.each([
    "clang_format_off_on.h",
    "kevin_wizard_section.h",
    "caa2_wizard_section.h",
    "pragma_region.h",
    "clang_format_nested_markers.h",
    "clang_format_doubled.h",
    "pnx_caa2_widget_decl.h",
  ])("preserves locked regions and remains idempotent for %s", (name) => {
    const source = fixture(name);
    const before = pnwExtractLockedRegionContents(source);
    expect(before.length).toBeGreaterThan(0);
    const result = pnwReorderHeaderText(source);
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(before);
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);
  });

  it("merges nested locked regions under the outer clang-format rule", () => {
    const nested = pnwFindLockedRegions(fixture("clang_format_nested_markers.h"));
    expect(nested).toHaveLength(1);
    expect(nested[0].ruleId).toBe("clang-format");
    expect(nested[0].content).toContain("START KEVIN CAA WIZARD SECTION");
    expect(nested[0].content).toContain("CAA2 WIZARD");

    const doubled = pnwFindLockedRegions(fixture("clang_format_doubled.h"));
    expect(doubled).toHaveLength(1);
    expect(doubled[0].ruleId).toBe("clang-format");
  });

  it("sorts declarations outside locked regions", () => {
    const wizard = pnwReorderHeaderText(fixture("kevin_wizard_section.h"));
    expect(wizard.text.indexOf("getApple")).toBeLessThan(wizard.text.indexOf("setZebra"));
    expect(wizard.text.indexOf("ZebraField")).toBeLessThan(wizard.text.indexOf("AppleField"));

    const pragma = pnwReorderHeaderText(fixture("pragma_region.h"));
    expect(pragma.text.indexOf("apple")).toBeLessThan(pragma.text.indexOf("beta"));
    expect(pragma.text.indexOf("field_z_first")).toBeLessThan(pragma.text.indexOf("field_a_second"));
  });

  it("strips and merges Kevin system-code declarations like the Python engine", () => {
    const basic = pnwReorderHeaderText(fixture("pnx_bom_analysis_param_min.h"));
    expect(basic.text).not.toContain("KEVIN_SYSTEM_CODE START");
    expect(basic.text).not.toContain("KEVIN_SYSTEM_CODE END");
    const basicSection = basic.text.slice(basic.text.indexOf("public: // KEVIN_SYSTEM_CODE"));
    expect(basicSection.indexOf("ConvertErrorListToString")).toBeLessThan(basicSection.indexOf("convertJson"));
    expect(basicSection.indexOf("convertJson")).toBeLessThan(basicSection.indexOf("GetSoftwareVersion"));
    expect(pnwReorderHeaderText(basic.text).changed).toBe(false);

    const split = pnwReorderHeaderText(fixture("pnx_bom_param_system_split.h"));
    const systemStart = split.text.indexOf("public: // KEVIN_SYSTEM_CODE");
    const functionsStart = split.text.indexOf("public: // functions", systemStart);
    const systemBlock = split.text.slice(systemStart, functionsStart);
    const functionsBlock = split.text.slice(functionsStart, split.text.indexOf("};", functionsStart));
    expect(systemBlock).toContain("ConvertErrorListToString");
    expect(systemBlock).toContain("convertJson");
    expect(systemBlock).toContain("GetSoftwareVersion");
    expect(functionsBlock).toContain("CheckoutAxis");
    expect(functionsBlock).not.toContain("convertJson");
    expect(pnwReorderHeaderText(split.text).changed).toBe(false);
  });

  it.each(["keep_markers", "off"] as const)("matches the alternate %s system-code mode", (mode) => {
    const source = fixture("pnx_bom_analysis_param_min.h");
    const result = pnwReorderHeaderText(source, { kevinSystemCodeMode: mode });
    expect(result.text).toContain("KEVIN_SYSTEM_CODE START");
    expect(result.text).toContain("KEVIN_SYSTEM_CODE END");
    expect(pnwReorderHeaderText(result.text, { kevinSystemCodeMode: mode }).changed).toBe(false);
  });

  it("converges for every local header fixture", () => {
    const headers = fs.readdirSync(fixtureRoot).filter((name) => /\.h(pp)?$/i.test(name));
    expect(headers.length).toBeGreaterThanOrEqual(15);
    for (const name of headers) {
      const once = pnwReorderHeaderText(fixture(name));
      expect(pnwReorderHeaderText(once.text).changed, name).toBe(false);
    }
  });

  it("preserves CRLF and locked bytes", () => {
    const source = fixture("kevin_wizard_section.h").replace(/\r?\n/g, "\r\n");
    const before = pnwExtractLockedRegionContents(source);
    const result = pnwReorderHeaderText(source);
    expect(result.text.replace(/\r\n/g, "")).not.toContain("\n");
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(before);
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);
  });

  it("preserves numbered Doxygen sequences and reports why", () => {
    const source = [
      "class Numbered {",
      "public:",
      "    /** 1. zeta */",
      "    void zeta();",
      "    /** 2. alpha */",
      "    void alpha();",
      "};",
      "",
    ].join("\n");
    const result = pnwReorderHeaderText(source);
    expect(result.text.indexOf("zeta")).toBeLessThan(result.text.indexOf("alpha"));
    expect(result.warnings.some((warning) => warning.includes("numbered Doxygen"))).toBe(true);
  });

  it("removes the empty line between the final declaration and class terminator", () => {
    const source = fixture("clang_format_class_tail.h");
    const result = pnwReorderHeaderText(source, { sortMembers: true });

    expect(result.changed).toBe(true);
    expect(result.text).not.toMatch(/\n[ \t]*\n[ \t]*};/);
    expect(result.text.match(/\n};/g)).toHaveLength(3);
    expect(result.text.indexOf("alpha()")).toBeLessThan(result.text.indexOf("zeta()"));
    expect(result.text).toContain(
      "//END KEVIN CAA WIZARD SECTION LockedWizardTail PARAM DECLARATION\n\n    // clang-format on\n};",
    );
    expect(result.text).not.toContain("// clang-format on\n\n};");
    expect(pnwReorderHeaderText(result.text, { sortMembers: true }).changed).toBe(false);

    const crlf = pnwReorderHeaderText(source.replace(/\n/g, "\r\n"), { sortMembers: true }).text;
    expect(crlf).not.toMatch(/\r\n[ \t]*\r\n[ \t]*};/);
    expect(crlf.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("preserves blank lines between independent comments", () => {
    const source = [
      "class CommentTail {",
      "public:",
      "    void alpha();",
      "    // generated section end",
      "",
      "    // formatter boundary",
      "",
      "};",
      "",
    ].join("\n");

    const result = pnwReorderHeaderText(source, { sortMembers: true });
    expect(result.text).toContain("    // generated section end\n\n    // formatter boundary");
    expect(result.text).not.toContain("    void alpha();\n\n};");
    expect(pnwReorderHeaderText(result.text, { sortMembers: true }).changed).toBe(false);
  });

  it("preserves the KtAlarmClock Wizard spacer before clang-format on", () => {
    const source = [
      "class KtAlarmClockParam {",
      "public:",
      "    // clang-format off",
      "    //START KEVIN CAA WIZARD SECTION KtAlarmClockParam PARAM DECLARATION",
      "    int TimeCounter;",
      "    //END KEVIN CAA WIZARD SECTION KtAlarmClockParam PARAM DECLARATION",
      "",
      "    // clang-format on",
      "",
      "};",
      "",
    ].join("\n");

    const result = pnwReorderHeaderText(source, { sortMembers: true });
    expect(result.text).toContain(
      "    //END KEVIN CAA WIZARD SECTION KtAlarmClockParam PARAM DECLARATION\n\n    // clang-format on\n};",
    );
    expect(result.text).not.toContain("    // clang-format on\n\n};");
    expect(pnwReorderHeaderText(result.text, { sortMembers: true }).changed).toBe(false);
  });
});
