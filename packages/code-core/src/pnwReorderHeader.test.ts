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
  it("places all operator forms after constructors/destructor, without changing access", () => {
    const source = ["class Sample {", "public:",
      "  void alpha();", "  int operator[](int i) const;", "  bool operator==(const Sample&) const;",
      "  Sample& operator = (const Sample&);", "  explicit operator bool() const;", "  void operator()();",
      "  ~Sample();", "  Sample();", "  void zeta();", "private:",
      "  void secret();", "  Sample& operator+=(int);", "};", ""].join("\n");
    const result = pnwReorderHeaderText(source);
    expect(result.text.indexOf("Sample();")).toBeLessThan(result.text.indexOf("~Sample();"));
    for (const op of ["operator[]", "operator==", "operator =", "operator bool", "operator()"]) {
      expect(result.text.indexOf(op)).toBeGreaterThan(result.text.indexOf("~Sample();"));
      expect(result.text.indexOf(op)).toBeLessThan(result.text.indexOf("void alpha"));
    }
    expect(result.text.indexOf("operator+=")).toBeGreaterThan(result.text.indexOf("private:"));
    expect(result.text.match(/public:/g)).toHaveLength(1);
    expect(pnwReorderHeaderText(result.text).text).toBe(result.text);
  });
  it("never splits a generated locked region containing access labels", () => {
    const source = ["class CaaInterface {", "public:", "  void zeta();",
      "// START KEVIN CAA WIZARD SECTION Example GET", "// clang-format off", "public: // Get",
      "  virtual int GetValue() const = 0;", "// clang-format on", "// END KEVIN CAA WIZARD SECTION Example GET",
      "public:", "  void alpha();", "};", ""].join("\n");
    const result = pnwReorderHeaderText(source);
    expect(result.text).toBe(source);
    expect(result.warnings).toEqual([]);
  });
  it.each(["#if FEATURE\n  void special();\n#endif", "#pragma pack(push, 1)\n  int value;\n#pragma pack(pop)"])("preserves class preprocessor boundaries: %s", boundary => {
    const source = `class Sample {\npublic:\n  void zeta();\n${boundary}\n  void alpha();\n};\n`;
    expect(pnwReorderHeaderText(source)).toMatchObject({ text: source, changed: false, warnings: [expect.stringContaining("preprocessor")] });
  });
  it("does not move declarations across CAA registration macros", () => {
    const source = "class Sample {\npublic:\n  void zeta();\n  CATDeclareClass;\n  void alpha();\n};\n";
    for (const invocation of [source, source.replace("CATDeclareClass;", "CATDeclareClass(Sample);")]) {
      const result = pnwReorderHeaderText(invocation);
      expect(result.text.indexOf("zeta()")).toBeLessThan(result.text.indexOf("CATDeclareClass"));
      expect(result.text.indexOf("CATDeclareClass")).toBeLessThan(result.text.indexOf("alpha()"));
    }
  });
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
    "generated_widget_section.h",
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
    const basic = pnwReorderHeaderText(fixture("generated_system_section.h"), { kevinSystemCodeMode: "merge_strip" });
    expect(basic.text).not.toContain("KEVIN_SYSTEM_CODE START");
    expect(basic.text).not.toContain("KEVIN_SYSTEM_CODE END");
    const basicSection = basic.text.slice(basic.text.indexOf("public: // KEVIN_SYSTEM_CODE"));
    expect(basicSection.indexOf("ConvertErrorListToString")).toBeLessThan(basicSection.indexOf("convertJson"));
    expect(basicSection.indexOf("convertJson")).toBeLessThan(basicSection.indexOf("GetSoftwareVersion"));
    expect(pnwReorderHeaderText(basic.text, { kevinSystemCodeMode: "merge_strip" }).changed).toBe(false);

    const split = pnwReorderHeaderText(fixture("generated_system_split.h"), { kevinSystemCodeMode: "merge_strip" });
    const systemStart = split.text.indexOf("public: // KEVIN_SYSTEM_CODE");
    const functionsStart = split.text.indexOf("public: // functions", systemStart);
    const systemBlock = split.text.slice(systemStart, functionsStart);
    const functionsBlock = split.text.slice(functionsStart, split.text.indexOf("};", functionsStart));
    expect(systemBlock).toContain("ConvertErrorListToString");
    expect(systemBlock).toContain("convertJson");
    expect(systemBlock).toContain("GetSoftwareVersion");
    expect(functionsBlock).toContain("unrelatedHelper");
    expect(functionsBlock).not.toContain("convertJson");
    expect(pnwReorderHeaderText(split.text, { kevinSystemCodeMode: "merge_strip" }).changed).toBe(false);
  });

  it.each(["keep_markers", "off"] as const)("matches the alternate %s system-code mode", (mode) => {
    const source = fixture("generated_system_section.h");
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
    const source = fixture("clang_format_class_tail.h").replace(/\r\n/g, "\n");
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


describe("same-access labels inside locked header regions", () => {
  const locked = (lines: string[], tag = "GET") => [
    `// START KEVIN CAA WIZARD SECTION Sample ${tag}`,
    "// clang-format off", ...lines, "// clang-format on",
    `// END KEVIN CAA WIZARD SECTION Sample ${tag}`,
  ].join("\n");
  const wrap = (body: string) => `class Sample {\n${body}\n};\n`;
  const expectBlocked = (source: string) => {
    const result = pnwReorderHeaderText(source);
    expect(result).toMatchObject({ text: source, changed: false });
    expect(result.warnings.join()).toMatch(/protected access|preprocessor|Protected/);
  };

  it.each(["\n", "\r\n", "\r"])("sorts independent exterior runs and preserves locked virtual order with %j", eol => {
    const first = locked(["public: // Get", "  virtual int zeta_get() const = 0;", "  virtual int alpha_get() const = 0;"]);
    const second = locked(["public: // Set", "  void zeta_set(int value);", "  void alpha_set(int value);"], "SET");
    const source = wrap([
      "public:", "  Sample();", "  ~Sample();", "public:",
      "  void zeta_before();", "  void alpha_before();", first,
      "  void zeta_between();", "  void alpha_between();", second,
      "  void zeta_after();", "  void alpha_after();", "private:",
      "  int zebra = next();", "  int apple = next();",
    ].join("\n")).replace(/\n/g, eol);
    for (const comments of [false, true]) {
      const result = pnwReorderHeaderText(source, { addMissingFunctionComments: comments });
      expect(result.changed).toBe(true);
      expect(result.warnings).toEqual([]);
      expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
      for (const run of ["before", "between", "after"]) {
        expect(result.text.indexOf(`alpha_${run}()`)).toBeLessThan(result.text.indexOf(`zeta_${run}()`));
      }
      expect(result.text.indexOf("zeta_before()")).toBeLessThan(result.text.indexOf("zeta_get()"));
      expect(result.text.indexOf("alpha_between()")).toBeGreaterThan(result.text.indexOf("alpha_get()"));
      expect(result.text.indexOf("zeta_between()")).toBeLessThan(result.text.indexOf("zeta_set("));
      expect(result.text.indexOf("alpha_after()")).toBeGreaterThan(result.text.indexOf("alpha_set("));
      expect(result.text.indexOf("zebra =")).toBeLessThan(result.text.indexOf("apple ="));
      expect(result.text.replaceAll(eol, "")).not.toMatch(/[\r\n]/);
      expect(result.text.includes("@brief")).toBe(comments);
      expect(pnwReorderHeaderText(result.text, { addMissingFunctionComments: comments }).text).toBe(result.text);
    }
  });

  it.each(["public", "private", "protected", "public slots", "signals"])("accepts only an identical %s label and preserves section order", access => {
    const source = wrap([
      "private:", "  int first = next();", "signals:", "  void signal_before();",
      `${access}:`, "  void zeta();", "  void alpha();",
      locked([`${access}: // same label`, "  int locked_field = next();", "  virtual void locked_virtual();"]),
      "  void zeta_after();", "  void alpha_after();", "public:", "  int last = next();",
    ].join("\n"));
    const result = pnwReorderHeaderText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.indexOf("alpha();")).toBeLessThan(result.text.indexOf("zeta();"));
    expect(result.text.indexOf("first =")).toBeLessThan(result.text.indexOf("signal_before"));
    expect(result.text.indexOf("signal_before")).toBeLessThan(result.text.indexOf("locked_field"));
    expect(result.text.indexOf("locked_field")).toBeLessThan(result.text.indexOf("last ="));
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
    expect(pnwReorderHeaderText(result.text).text).toBe(result.text);
  });

  it("uses default private access before the first explicit class section", () => {
    const source = wrap([locked(["private:", "  int fixed = next();"]), "public:", "  void zeta();", "  void alpha();"].join("\n"));
    const result = pnwReorderHeaderText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.indexOf("alpha()")).toBeLessThan(result.text.indexOf("zeta()"));
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
  });

  it.each([
    ["private:", "  void hidden();"],
    ["private:", "  void hidden();", "public:", "  void exposed();"],
    ["public slots:", "  void exposed();"],
    ["public: void inline_label();"],
    ["public:", "  class Nested {", "public:", "    void nested();", "  };"],
  ].map(lines => ({ lines })))("rejects changed, unsupported or nested access: $lines", ({ lines }) => {
    expectBlocked(wrap(["public:", "  void zeta();", locked(lines), "  void alpha();"].join("\n")));
  });

  it.each([
    ["  void", ["public:", "  void locked_method();"], "  alpha();"],
    ["  void zeta(", ["public:", "  void locked_method();"], "  int value);"],
    ["  void zeta() {", ["public:", "  void locked_method();"], "  }"],
    ["", ["public:", "  void"], "  alpha();"],
    ["", ["public:", "  void zeta() {"], "  }"],
    ["  int values[", ["public:", "  void locked_method();"], "  2];"],
    ["  int value =", ["public:", "  void locked_method();"], "  next();"],
  ] as Array<[string, string[], string]>)("rejects a lock that cuts a declaration or delimiter: %j", (before, lines, after) => {
    expectBlocked(wrap(["public:", before, locked(lines), after].join("\n")));
  });

  it("ignores label-looking comment and string text inside a complete lock", () => {
    const source = wrap(["public:", "  void zeta();", "  void alpha();", locked([
      "public:", "  /*", "private:", "  */", "  const char* text = \"protected:\";", "  void generated();",
    ])].join("\n"));
    const result = pnwReorderHeaderText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.indexOf("alpha()")).toBeLessThan(result.text.indexOf("zeta()"));
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
  });

  it("allows complete macros and inline functions beside a protected label", () => {
    const source = wrap(["public:", "  CATDeclareInterface;", "  Q_OBJECT", "  void zeta() {}", "  void alpha() {}",
      locked(["public:", "  void generated();"]), "private:", "  Sample(const Sample&);", "  Sample& operator=(const Sample&);"].join("\n"));
    const result = pnwReorderHeaderText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.indexOf("alpha()")).toBeLessThan(result.text.indexOf("zeta()"));
    expect(result.text.indexOf("Q_OBJECT")).toBeLessThan(result.text.indexOf("alpha()"));
  });

  it.each([
    "  // registration note\n  CATDeclareInterface;",
    "  // meta-object note\n  Q_OBJECT\n  void another();",
    "  void zeta(); CATDeclareInterface;",
    "  void zeta(); int field = next();",
  ])("rejects uncertain macro or multiple declaration ownership: %j", code => {
    expectBlocked(wrap(["public:", "  void zebra();", code, "  void alpha();",
      locked(["public:", "  void generated();"])].join("\n")));
  });

  it.each(["merge_strip", "off"] as const)("keeps the old warning for %s mode", kevinSystemCodeMode => {
    const source = wrap(["public:", "  void zeta();", locked(["public:", "  void generated();"]), "  void alpha();"].join("\n"));
    const result = pnwReorderHeaderText(source, { kevinSystemCodeMode });
    expect(result).toMatchObject({ text: source, changed: false });
    expect(result.warnings.join()).toContain("protected access");
  });

  it.each(["#if FEATURE\n  void branch();\n#endif", "#pragma pack(push, 1)", "  void zeta(); \\\n  void alpha();"])("does not relax preprocessor or continuation boundaries: %j", code => {
    expectBlocked(wrap(["public:", code, locked(["public:", "  void generated();"])].join("\n")));
  });

  it("preserves mixed line endings and a BOM without trying to normalize protected bytes", () => {
    const source = "\uFEFF" + wrap(["public:", "  void zeta();", locked(["public:", "  void generated();"]), "  void alpha();"].join("\n"));
    const mixed = source.replace("void generated();\n", "void generated();\r\n");
    expectBlocked(mixed);
    const result = pnwReorderHeaderText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.startsWith("\uFEFF")).toBe(true);
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
  });
});

describe("system-code block spacing", () => {
  const cases = ["\n", "\r\n"].flatMap(eol => [false, true].flatMap(populated =>
    ["", "\n", " \t\n\n"].flatMap(gap => ["declarations", "wizard", "access", "class-end"].map(after => ({ eol, populated, gap, after })))));

  it.each(cases)("preserves the whole block and its following whitespace: %j", ({ eol, populated, gap, after }) => {
    const block = [
      "  // KEVIN_SYSTEM_CODE START",
      ...(populated ? ["  void zeta_fixed();", "  int zebra = next();", "", "  void alpha_fixed();", "  int apple = next();"] : []),
      "    // KEVIN_SYSTEM_CODE END  ",
      "",
    ].join("\n");
    const declarations = "  void zeta_after();\n  void alpha_after();\n";
    const wizard = ["  // START KEVIN CAA WIZARD SECTION Sample GET", "  void zebra_generated();",
      "  void apple_generated();", "  // END KEVIN CAA WIZARD SECTION Sample GET", ""].join("\n");
    const suffix = after === "class-end" ? "  };\n"
      : `${after === "wizard" ? wizard : after === "access" ? "private:\n" : ""}${declarations}};\n`;
    const source = (`class Sample {\npublic:\n  void zeta_before();\n  void alpha_before();\n${block}${gap}${suffix}`).replace(/\n/g, eol);
    const expected = source
      .replace(`  void zeta_before();${eol}  void alpha_before();`, `  void alpha_before();${eol}  void zeta_before();`)
      .replace(`  void zeta_after();${eol}  void alpha_after();`, `  void alpha_after();${eol}  void zeta_after();`);

    const result = pnwReorderHeaderText(source, { sortMembers: true });
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe(expected);
    expect(result.changed).toBe(true);
    expect(pnwReorderHeaderText(result.text, { sortMembers: true }).changed).toBe(false);
  });

  it("does not add a missing spacer before a documented declaration", () => {
    const source = ["class Sample {", "public:", "  // KEVIN_SYSTEM_CODE START", "  void generated();",
      "  // KEVIN_SYSTEM_CODE END", "  /** @brief Existing comment. */", "  void alpha();", "};", ""].join("\n");
    expect(pnwReorderHeaderText(source, { addMissingFunctionComments: true })).toEqual({
      text: source, changed: false, warnings: [],
    });
  });
});
