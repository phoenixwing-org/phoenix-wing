import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { pnwReorderCppText } from "./pnwReorderCpp.js";
import { pnwExtractLockedRegionContents } from "./pnwReorderHeader.js";

const fixtureRoot = fileURLToPath(new URL("./fixtures/", import.meta.url));

const PYTHON_PARITY_HASHES: Record<string, string> = {
  "annotation_sep.cpp": "cb09b54c1181703e70b48ee197d50e4f91440e81b75644310d901abbcf0bc0bb",
  "internal_calls.cpp": "b8714c1ac231fc08086ee986c48140c7d80395a224d0f5cebcfcccabd955dbf0",
  "ktca_KTCAutoCodeFrm_KTCAutoCodeUI.m_src_KTCAutoDialog.cpp": "ad39a1974a7b0bab15e13066f5e5beb82b68d4039dbdbc0b536a735fea33560e",
  "ktca_KTCAutoCodeInterfaces_KTCAutoCodeItf.m_src_KTCAutoAttrAccess.cpp": "827b909e4f56915e258cfc1db57580eb57a3028d78428d44c8470a33c2392620",
  "ktca_KTCAutoCodeInterfaces_KTCAutoCodeItf.m_src_KTCAutoBuildGSM.cpp": "df96a6eb9754b844466a691bcf2c0a702e63fe9bde985ec0287addf494054bd5",
  "ktca_KTCAutoCodeInterfaces_KTCAutoCodeItf.m_src_KTCAutoPartDoc.cpp": "949e5c00b0e80bb5e033c45ce4a9bd0d8ab2a06db83d26543d4dcdd1ffa79422",
};

function fixture(name: string): string {
  return fs.readFileSync(path.join(fixtureRoot, name), "utf8");
}

function normalizedHash(text: string): string {
  return crypto.createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

describe("reorderCppEngine", () => {
  it.each([
    "// clang-format off", "// clang-format on", "// START KEVIN CAA WIZARD SECTION Sample GET",
    "// END KEVIN CAA WIZARD SECTION Sample GET", "// CAA2 WIZARD", "// END CAA2 WIZARD",
    "// KEVIN_SYSTEM_CODE START", "// KEVIN_SYSTEM_CODE END", "#pragma region Methods", "#pragma endregion",
  ])("preserves the entire file when a protection boundary is unmatched: %s", marker => {
    const source = `Sample::Sample() {}\n${marker}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.join()).toContain("boundary without");
  });
  it.each([
    "anonymous_namespace.cpp",
    "conditional_nested.cpp",
  ])("preserves the complete safety fixture %s and reports why it was skipped", name => {
    const source = fixture(`reorder-safety/${name}`);
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.join()).toContain("non-member");
    expect(pnwReorderCppText(result.text, "Sample")).toEqual(result);
  });

  it.each([
    'TIE_SampleInterface(Sample);',
    'CATImplementClass(Sample, Implementation, Base, CATNull);',
    'namespace { int helper() { return 1; } }',
    'static int helper() { return 1; }',
  ])("preserves registrations, helpers and directives at the file tail: %s", tail => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n${tail}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.join()).toContain("non-member");
  });

  it.each([
    '#if FEATURE\nvoid Sample::zeta() {}\n#else\nvoid Sample::beta() {}\n#endif',
    '#ifdef FEATURE\nvoid Sample::zeta() {}\n#endif',
    '#ifndef FEATURE\nvoid Sample::zeta() {}\n#endif',
    'void Sample::zeta() {\n#if FEATURE\n  work();\n#elif OTHER\n  fallback();\n#endif\n}',
    '#define SAMPLE_FLAG 1\nvoid Sample::zeta() {}\n#undef SAMPLE_FLAG',
  ])("does not detach a method from preprocessing structure: %s", middle => {
    const source = `Sample::Sample() {}\n${middle}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.join()).toContain("preprocessor");
  });

  it.each([
    ["// clang-format off", "// clang-format on"],
    ["// START KEVIN CAA WIZARD SECTION", "// END KEVIN CAA WIZARD SECTION"],
    ["// CAA2 WIZARD", "// END CAA2 WIZARD"],
  ])("keeps generated or formatting region boundaries and contents: %s", (start, end) => {
    const source = `Sample::Sample() {}\n${start}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n${end}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.join()).toContain("protected region");
  });

  it.each(["\n", "\r\n", "\r"])("moves split signatures with their original documentation and separators (%j)", eol => {
    const source = fixture("reorder-safety/split_signature_comments.cpp").replace(/\r\n|\r|\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    const normalized = result.text.replace(/\r\n|\r/g, "\n");
    expect(result.changed).toBe(true);
    expect(result.warnings).toBeUndefined();
    expect(normalized.indexOf("Sample::Sample")).toBeLessThan(normalized.indexOf("Sample::alpha"));
    expect(normalized.indexOf("Sample::alpha")).toBeLessThan(normalized.indexOf("Sample::zeta"));
    expect(normalized).toContain("//--------------------------------------------------------------------------------\n/** @brief Zeta documentation. */\nconst SampleResult&\nSample::zeta");
    expect(normalized).toContain("//----------------------------------------------------------------\n/** @brief Constructor documentation. */\nSample::Sample");
    expect(normalized).toContain("//------------------------------------------------------------------------\n/**\n * @brief Alpha documentation.\n */\nconst SampleResult&\nSample::alpha");
    expect(result.text).toBe(normalized.replace(/\n/g, eol));
    expect(pnwReorderCppText(result.text, "Sample").changed).toBe(false);
  });

  it.each(["\n", "\r\n", "\r"])("moves complete comment banners verbatim with split signatures and converges (%j)", eol => {
    const preamble = '#include "Sample.h"\n\n// File-wide note stays before the definitions.\n';
    const zeta = "  //--------------------------------------------------------------------------------  \n  // Zeta documentation.\n  //\n  // A second explanatory line.\n  //--------------------------------------------------  \nconst SampleResult&\nSample::zeta() { return result_; }\n";
    const constructor = "//------------------------------\n// Constructor documentation.\n//----------------------------------------------------------------\nSample::Sample() {}\n";
    const alpha = "//------------------------------------\n// Alpha documentation.\n//----------------------------------------------\nconst SampleResult&\nSample::alpha() { return result_; }\n";
    const source = (preamble + zeta + constructor + alpha).replace(/\n/g, eol);
    const expected = (preamble + constructor + alpha + zeta).replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.changed).toBe(true);
    expect(result.text).toBe(expected);
    expect(pnwReorderCppText(result.text, "Sample")).toEqual({ text: expected, changed: false, className: "Sample" });
  });

  it("keeps the first constructor banner out of the preamble without adding another separator", () => {
    const source = "//-----------------------\n// Constructor documentation.\n//---------------------------------------\nSample::Sample() {}\n";
    const result = pnwReorderCppText(source, "Sample");
    expect(result).toEqual({ text: source, changed: false, className: "Sample" });
  });

  it.each(["Copyright Example", "SPDX-License-Identifier: MIT", "SPDX-FileCopyrightText: 2026 Example", "@file Example.cpp", "@mainpage Example", "@page Example", "cOpYrIgHt Example"])("keeps a complete file metadata frame in the preamble: %s", metadata => {
    const frame = `//-------------------\n// ${metadata}\n//-------------------------------------\n`;
    const preamble = `#include "Sample.h"\n${frame}`;
    const source = `${preamble}void Sample::zeta() {}\nSample::Sample() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(preamble)).toBe(true);
    expect(result.text.split(frame)).toHaveLength(2);
    expect(result.text.indexOf("Sample::Sample")).toBeLessThan(result.text.indexOf("Sample::alpha"));
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
    expect(pnwReorderCppText(result.text, "Sample").warnings).toBeUndefined();
  });

  it.each(["Copyright Example", "SPDX-License-Identifier: MIT", "SPDX-FileCopyrightText: 2026 Example", "@file Example.cpp", "@mainpage Example", "@page Example"])("preserves file metadata between definitions instead of assigning it to the next function: %s", metadata => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\n//-------------------\n// ${metadata}\n//-------------------------------------\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("comments not attached");
  });

  it("does not steal the closing separator of a preceding file frame", () => {
    const frame = "//-------------------\n// Copyright Example\n//-------------------------------------\n";
    const banner = "//--------------------------\n// Zeta documentation.\n//------------------------------------------\n";
    const preamble = `#include "Sample.h"\n${frame}`;
    const source = `${preamble}${banner}void Sample::zeta() {}\nSample::Sample() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(preamble)).toBe(true);
    expect(result.text.split(frame)).toHaveLength(2);
    expect(result.text).toContain(`${banner}void Sample::zeta() {}`);
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
    expect(pnwReorderCppText(result.text, "Sample").warnings).toBeUndefined();
  });

  it("keeps references and commented examples inside an attached banner without extracting fake definitions", () => {
    const banner = "//-------------------------\n// Compare this result with Sample::zeta().\n// void Sample::oldMethod() { work(); }\n//---------------------------------------\n";
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\n${banner}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(`${banner}void Sample::alpha() {}`);
    expect(result.text.indexOf("void Sample::alpha")).toBeLessThan(result.text.indexOf("void Sample::zeta"));
    expect(result.text.match(/oldMethod/g)).toHaveLength(1);
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("preserves an extra glued separator before a complete banner exactly once", () => {
    const source = "Sample::Sample() {}\nvoid Sample::zeta() {} //---------------------------\n//-----------------------\n// Alpha documentation.\n//---------------------------------------\nvoid Sample::alpha() {}\n";
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain("//---------------------------\n//-----------------------\n// Alpha documentation.\n//---------------------------------------\nvoid Sample::alpha() {}");
    expect(result.text.match(/\/\/-{27}\n/g)).toHaveLength(1);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
    expect(pnwReorderCppText(result.text, "Sample").warnings).toBeUndefined();
  });

  it.each([
    "//-----------------------\n\n// Loose explanation.\n//---------------------------------------\n",
    "//-----------------------\n// Loose explanation.\n\n//---------------------------------------\n",
    "//-----------------------\n//   \n//---------------------------------------\n",
    "//-----------------------\n/* A separate block note. */\n//---------------------------------------\n",
  ])("does not assign incomplete or ambiguous banners to the next definition: %j", banner => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\n${banner}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("comments not attached");
  });

  it("does not reinterpret a glued separator as the missing opening line of a banner", () => {
    const source = "Sample::Sample() {}\nvoid Sample::zeta() {} //---------------------------\n// A note after the previous definition.\n//---------------------------------------\nvoid Sample::alpha() {}\n";
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("comments not attached");
  });

  it.each([
    ["// clang-format off", "// clang-format on"],
    ["// START KEVIN CAA WIZARD SECTION Sample GET", "// END KEVIN CAA WIZARD SECTION Sample GET"],
    ["// CAA2 WIZARD Sample", "// END CAA2 WIZARD Sample"],
    ["// KEVIN_SYSTEM_CODE START", "// KEVIN_SYSTEM_CODE END"],
  ])("does not treat protection markers inside a comment frame as ordinary documentation: %s", (start, end) => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\n//-----------------------\n${start}\n// Preserved metadata.\n${end}\n//---------------------------------------\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("keeps end-of-line explanations with their function without copying them onto another member", () => {
    const source = "Sample::Sample() {}\nvoid Sample::zeta() {} // Retain this explanation.\nvoid Sample::alpha() {}\n";
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain("void Sample::zeta() {} // Retain this explanation.");
    expect(result.text.match(/Retain this explanation/g)).toHaveLength(1);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").changed).toBe(false);
  });

  it.each([
    "// A note not attached to the following definition.\n//----------------------------------------\n",
    "/* A separate block note. */\n//----------------------------------------\n",
  ])("never silently discards unowned notes before a separator", note => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\n${note}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("comments not attached");
  });

  it("never silently discards a trailing source comment", () => {
    const source = "Sample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n// End of source explanation.\n";
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.endsWith("// End of source explanation.\n")).toBe(true);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").changed).toBe(false);
  });

  it("retains a separator glued to the final function as a source trailer", () => {
    const source = "Sample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {} //------------------------------------------------------------------------\n";
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.endsWith("//------------------------------------------------------------------------\n")).toBe(true);
    expect(result.text.match(/\/\/-{72}\n/g)).toHaveLength(1);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").changed).toBe(false);
  });

  it.each([
    'CATImplementClass(Sample, Implementation, Base, CATNull);',
    '#if FEATURE\nvoid helper() {}\n#endif',
    '#pragma warning(push)\n#pragma warning(pop)',
    'namespace Detail { void helper() {} }',
  ])("preserves non-member content between methods: %s", gap => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\n${gap}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("non-member");
  });
  it("ignores braces and fake methods inside literals and comments", () => {
    const source = ['Sample::Sample() {}', 'void Sample::zeta() {',
      '  const char* text = "} Sample::fake() {";',
      '  const char* raw = R"tag( } " Sample::fake() { )tag";',
      '  // } Sample::fake() {', '}', 'void Sample::alpha() {}', ''].join("\n");
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toContain('const char* raw = R"tag( } " Sample::fake() { )tag";');
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });
  it("never reorders definitions across a locked generated block", () => {
    const source = 'Sample::Sample() {}\n// clang-format off\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n// clang-format on\n';
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("protected region");
  });
  it("matches the archived Python output and converges for every local cpp fixture", () => {
    for (const [name, expectedHash] of Object.entries(PYTHON_PARITY_HASHES)) {
      const result = pnwReorderCppText(fixture(name), path.parse(name).name);
      expect(normalizedHash(result.text), name).toBe(expectedHash);
      expect(pnwReorderCppText(result.text, path.parse(name).name).changed, name).toBe(false);
    }
  });

  it("keeps annotation separators separate and sorts member definitions", () => {
    const result = pnwReorderCppText(fixture("annotation_sep.cpp"), "annotation_sep");
    expect(result.text.indexOf("FooString::alpha()")).toBeLessThan(result.text.indexOf("FooString::compare("));
    expect(result.text).toContain("//---static---");
    expect(result.text).toContain("//---INSIDE FUNCTION---");
    const lines = result.text.split(/\r?\n/);
    expect(lines.some((line, index) => line.startsWith("//---") && lines[index + 1]?.startsWith("//---"))).toBe(false);
  });

  it("does not extract class-qualified calls from inside a function body", () => {
    const result = pnwReorderCppText(fixture("internal_calls.cpp"), "internal_calls");
    expect(result.text.match(/FooString::init/g)).toHaveLength(2);
    expect(result.text.match(/FooString::safeDelete/g)).toHaveLength(2);
  });

  it("moves leading comments and split return types with their function", () => {
    const source = [
      "#include \"Foo.h\"",
      "",
      "Foo::Foo() {}",
      "//------------------------------",
      "// zeta documentation",
      "void Foo::zeta() {}",
      "//------------------------------",
      "const FooResult&",
      "Foo::beta() { return value_; }",
      "//------------------------------",
      "// alpha documentation",
      "void Foo::alpha() {}",
      "",
    ].join("\n");
    const result = pnwReorderCppText(source, "Foo");
    expect(result.text.indexOf("// alpha documentation")).toBeLessThan(result.text.indexOf("// zeta documentation"));
    expect(result.text.indexOf("// zeta documentation")).toBeLessThan(result.text.indexOf("Foo::zeta()"));
    expect(result.text.indexOf("const FooResult&")).toBeLessThan(result.text.indexOf("Foo::beta()"));
  });

  it("includes member definitions that appear before the constructor", () => {
    const source = [
      "#include \"Foo.h\"",
      "",
      "void Foo::zeta() {}",
      "Foo::Foo() {}",
      "void Foo::alpha() {}",
      "",
    ].join("\n");
    const result = pnwReorderCppText(source, "Foo");
    expect(result.text.indexOf("#include")).toBeLessThan(result.text.indexOf("Foo::Foo()"));
    expect(result.text.indexOf("Foo::Foo()")).toBeLessThan(result.text.indexOf("Foo::alpha()"));
    expect(result.text.indexOf("Foo::alpha()")).toBeLessThan(result.text.indexOf("Foo::zeta()"));
  });

  it("leaves independently constructed constructor-less Wizard methods unchanged", () => {
    const source = fixture("generated_without_constructor.cpp");
    const result = pnwReorderCppText(source, "generated_without_constructor");
    expect(result.changed).toBe(false);
    expect(result.text).toBe(source);
    expect(result.className).toBe("SampleCommand");
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
  });

  it("detaches a separator glued to a closing brace and preserves CRLF", () => {
    const source = [
      "Foo::Foo() {",
      "}",
      "",
      "int Foo::zeta() { return 2; } //--------------------",
      "int Foo::alpha() { return 1; }",
      "",
    ].join("\r\n");
    const result = pnwReorderCppText(source, "Foo");
    expect(result.text).not.toContain("} //");
    expect(result.text).toContain("}\r\n//");
    expect(result.text.replace(/\r\n/g, "")).not.toContain("\n");
    expect(result.text.indexOf("Foo::alpha")).toBeLessThan(result.text.indexOf("Foo::zeta"));
  });
});

describe("file-level pragma region barriers", () => {
  it.each(["\n", "\r\n", "\r"])("sorts only complete functions in each outside run and keeps regions verbatim (%j)", eol => {
    const region = "  #pragma region Fixed // keep this spacing\n\nvoid Sample::lockedZeta() {}\nvoid Sample::lockedAlpha() {}\n  #pragma endregion Fixed\n";
    const source = (`\uFEFF#include "Sample.h"\nSample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n${region}void Sample::yankee() {}\nvoid Sample::beta() {}\n`).replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    const fixed = region.replace(/\n/g, eol);
    expect(result.warnings).toBeUndefined();
    expect(result.changed).toBe(true);
    expect(result.text.startsWith('\uFEFF#include "Sample.h"')).toBe(true);
    expect(result.text.split(fixed)).toHaveLength(2);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(result.text.indexOf("Sample::zeta")).toBeLessThan(result.text.indexOf("#pragma region"));
    expect(result.text.indexOf("#pragma endregion")).toBeLessThan(result.text.indexOf("Sample::beta"));
    expect(result.text.indexOf("Sample::beta")).toBeLessThan(result.text.indexOf("Sample::yankee"));
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
    expect(pnwReorderCppText(result.text, "Sample")).toEqual({ text: result.text, changed: false, className: "Sample" });
  });

  it.each(["\n", "\r\n", "\r"])("uses the full-file constructor identity when it is inside the first region (%j)", eol => {
    const region = "#pragma region Fixed\nSample::Sample() {}\nvoid Sample::lockedZeta() {}\nvoid Sample::lockedAlpha() {}\n#pragma endregion\n";
    const source = `${region}\n\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`.replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(region.replace(/\n/g, eol))).toBe(true);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
    expect(pnwReorderCppText(result.text, "Sample").warnings).toBeUndefined();
  });

  it("leaves an entire region unchanged when all definitions are inside it", () => {
    const source = "#pragma region Fixed\nSample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n#pragma endregion";
    expect(pnwReorderCppText(source, "Sample")).toEqual({ text: source, changed: false, className: "Sample" });
  });

  it.each([
    "#pragma region Empty\n// Empty frame\n#pragma endregion\n",
    "#pragma region Fixed\n// clang-format off\nvoid Sample::lockedZeta() {}\nvoid Sample::lockedAlpha() {}\n// clang-format on\n#pragma endregion\n",
  ])("does not attach a completed region's trailing comments to the next outside function: %j", region => {
    const source = `Sample::Sample() {}\n${region}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(region);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
    expect(pnwReorderCppText(result.text, "Sample")).toEqual({ text: result.text, changed: false, className: "Sample" });
  });

  it("does not infer a constructor separately for each outside run", () => {
    const source = "void Sample::zeta() {}\n#pragma region Fixed\nvoid Sample::locked() {}\n#pragma endregion\nvoid Sample::alpha() {}\n";
    expect(pnwReorderCppText(source, "Sample")).toEqual({ text: source, changed: false, className: "Sample" });
  });

  it("preserves nested, adjacent and empty region slices including an EOF without a newline", () => {
    const first = "#pragma region Outer\n#pragma region Inner\n// fixed comment\n#pragma endregion Inner\n#pragma endregion Outer\n";
    const last = "#pragma region Empty\n#pragma endregion";
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n${first}${last}`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.endsWith(first + last)).toBe(true);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it.each([
    "void Sample::zeta() {\n#pragma region Fixed\n  work();\n#pragma endregion\n}\n",
    "void Sample::zeta() {\n#pragma region Fixed\n}\n#pragma endregion\n",
    "#pragma region Fixed\nvoid Sample::zeta() {\n#pragma endregion\n}\n",
    "const SampleResult&\n#pragma region Fixed\nSample::zeta() { return result_; }\n#pragma endregion\n",
    "//------------------\n// Zeta documentation.\n#pragma region Fixed\n//---------------------------\nvoid Sample::zeta() {}\n#pragma endregion\n",
    "namespace Detail {\n#pragma region Fixed\nvoid Sample::zeta() {}\n#pragma endregion\n}\n",
    "#pragma region Fixed\n//------------------\n// Zeta documentation.\n//---------------------------\n#pragma endregion\nvoid Sample::zeta() {}\n",
    "#pragma region Fixed\n/** @brief Zeta documentation. */\n#pragma endregion\nvoid Sample::zeta() {}\n",
    "// clang-format off\n#pragma region Fixed\nvoid Sample::zeta() {}\n// clang-format on\n#pragma endregion\n",
    "#pragma region Fixed\n// clang-format off\nvoid Sample::zeta() {}\n#pragma endregion\n// clang-format on\n",
  ])("fails closed when a region cuts a definition or another protection boundary: %j", middle => {
    const source = `Sample::Sample() {}\n${middle}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it.each([
    "TIE_SampleInterface(Sample);",
    '#include "TIE_SampleInterface.h"',
    "#if FEATURE\nvoid Sample::conditional() {}\n#endif",
    "#pragma warning(push)\n#pragma warning(pop)",
    "static void helper() {}",
  ])("does not hide other directives or non-member code inside an opaque region: %j", extra => {
    const source = `#pragma region Fixed\n${extra}\nSample::Sample() {}\n#pragma endregion\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("non-member");
  });

  it.each([
    ["// Continued comment \\", "#pragma region Fixed", "void Sample::fixed() {}", "#pragma endregion", ""].join("\n"),
    ["#pragma region Fixed \\", "void Sample::fixed() {}", "#pragma endregion", ""].join("\n"),
  ])("rejects region directives adjacent to a continued physical line: %j", middle => {
    const source = `Sample::Sample() {}\n${middle}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("does not normalize mixed line endings inside a protected region", () => {
    const source = "Sample::Sample() {}\n#pragma region Fixed\r\nvoid Sample::fixed() {}\r#pragma endregion\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n";
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("mixed line endings");
  });
});


describe("file-level TIE registration barriers", () => {
  const registration = '#include "TIE_Example.h" // registration header\nTIE_Example(Sample); // registration\n';

  it.each(["\n", "\r\n", "\r"])("sorts each side independently and preserves exact registration text (%j)", eol => {
    const source = (`\uFEFF#include "Sample.h"\nSample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::beta() {}\n${registration}void Sample::yankee() {}\nvoid Sample::alpha() {}\n`).replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith('\uFEFF#include "Sample.h"')).toBe(true);
    expect(result.text.split(registration.replace(/\n/g, eol))).toHaveLength(2);
    expect(result.text.indexOf("Sample::beta")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(result.text.indexOf("Sample::zeta")).toBeLessThan(result.text.indexOf("TIE_Example(Sample)"));
    expect(result.text.indexOf("TIE_Example(Sample)")).toBeLessThan(result.text.indexOf("Sample::alpha"));
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::yankee"));
    expect(pnwReorderCppText(result.text, "Sample")).toEqual({ text: result.text, changed: false, className: "Sample" });
  });

  it("sorts the existing anonymous registration-tail safety fixture without moving its registration", () => {
    const source = fixture("reorder-safety/registration_tail.cpp");
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.endsWith(source.slice(source.indexOf('#include "TIE_')))).toBe(true);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("keeps a preamble registration in place and sorts subsequent methods", () => {
    const prefix = '#include "Sample.h"\n' + registration + '\n';
    const source = `${prefix}void Sample::zeta() {}\nSample::Sample() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(prefix)).toBe(true);
    expect(result.text.indexOf("Sample::Sample")).toBeLessThan(result.text.indexOf("Sample::alpha"));
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("keeps a complete file metadata frame in the original preamble", () => {
    const metadata = '//----------------\n// Copyright Example\n//-----------------------\n';
    const source = `${metadata}void Sample::zeta() {}\nSample::Sample() {}\nvoid Sample::alpha() {}\n${registration}`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(metadata)).toBe(true);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("preserves a tail registration and detached registration notes without a final newline", () => {
    const tail = '\n// Registration description\n// -------\n\n' + registration + '\n// Dictionary entry\n// Keep this spelling.';
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n${tail}`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.endsWith(tail)).toBe(true);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("anchors an ambiguous detached paragraph together with the first complete function", () => {
    const anchored = '\n\n// Detached registration or method explanation.\n// Keep it with the first method.\n\nvoid Sample::zeta() {}\n';
    const source = `Sample::Sample() {}\n${registration}${anchored}void Sample::yankee() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(registration + anchored);
    expect(result.text.indexOf("Sample::zeta")).toBeLessThan(result.text.indexOf("Sample::alpha"));
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::yankee"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("keeps a detached registration paragraph fixed while a distinct function banner moves", () => {
    const paragraph = '\n// Detached registration explanation.\n// Preserve this paragraph.\n\n';
    const banner = '//----------------\n// Zeta documentation.\n//---------------------------\n';
    const source = `Sample::Sample() {}\n${registration}${paragraph}${banner}void Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(registration + paragraph);
    expect(result.text).toContain(banner + 'void Sample::zeta() {}');
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("preserves complete generated sections following a registration", () => {
    const locked = '// CAA2 WIZARD\n// clang-format off\n//----------------------------------------\nvoid Sample::alpha() {}\n//----------------------------------------\nvoid Sample::beta() {}\n// clang-format on\n// END CAA2 WIZARD\n';
    const source = `//----------------------------------------\nSample::Sample() {}\n${registration}\n// Registration notes.\n\n${locked}`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(locked);
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("uses one full-file constructor identity across multiple registration pairs", () => {
    const second = '#include "TIE_Second.h"\nTIE_Second(Sample);\n';
    const source = `void Sample::zeta() {}\nvoid Sample::beta() {}\n${registration}Sample::Sample() {}\n${second}void Sample::yankee() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.indexOf("Sample::beta")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(result.text.indexOf(registration)).toBeLessThan(result.text.indexOf("Sample::Sample"));
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::yankee"));
    expect(result.text).toContain(second);
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("leaves sorted runs and all surrounding whitespace byte-for-byte unchanged", () => {
    const source = `Sample::Sample() {}\n\nSample::~Sample() {}\n\n// Registration description\n// -------\n\n${registration}\n// Detached notes\n\nvoid Sample::alpha() {}\n\nvoid Sample::zeta() {}\n\n`;
    expect(pnwReorderCppText(source, "Sample")).toEqual({ text: source, changed: false, className: "Sample" });
  });

  it("leaves constructor-less files untouched", () => {
    const source = `${registration}void Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    expect(pnwReorderCppText(source, "Sample")).toEqual({ text: source, changed: false, className: "Sample" });
  });

  it.each([
    '#include "TIE_Other.h"\nTIE_Example(Sample);\n',
    '#include "TIE_Example.h"\nTIE_Example(Other);\n',
    '#include "TIE_Example.h"\nTIE_Example(Sample, Other);\n',
    '#include "TIE_Example.h"\nTIE_Example(Sample)\n',
    '#include "TIE_Example.h"\nTIE_Example(Sample); int extra;\n',
    '#include "TIE_Example.h"\nTIE_Example(\nSample);\n',
    '#include "TIE_Example.h"\nint extra;\nTIE_Example(Sample);\n',
    '#include "TIE_Example.h"\nCATImplementClass(Sample, Implementation, Base, Null);\nTIE_Example(Sample);\n',
    '#include "TIE_Example.h" /* crossed\nTIE_Example(Sample);\n*/\nTIE_Example(Sample);\n',
    '#include "TIE_Example.h"\n/* TIE_Example(Sample); */\nTIE_Example(Sample); /* crossed\n*/\n',
    'TIE_Example(Sample);\n',
    '#include <TIE_Example.h>\nTIE_Example(Sample);\n',
    '#include "dir/TIE_Example.h"\nTIE_Example(Sample);\n',
    '#if FEATURE\n' + registration + '#endif\n',
    '#pragma region Fixed\n' + registration + '#pragma endregion\n',
    '#pragma warning(push)\n' + registration + '#pragma warning(pop)\n',
    'namespace Detail {\n' + registration + '}\n',
    'void Sample::inside() {\n' + registration + '}\n',
    'void\n' + registration + 'Sample::split() {}\n',
    '//----------------\n// Split documentation.\n' + registration + '//----------------\nvoid Sample::split() {}\n',
    '/** @brief Split documentation. */\n' + registration + 'void Sample::split() {}\n',
    ['// Continued comment \\', registration].join('\n'),
    ['#include "TIE_Example.h" \\', 'TIE_Example(Sample);', ''].join('\n'),
    ['#include "TIE_Example.h"', '// Continued comment \\', 'TIE_Example(Sample);', ''].join('\n'),
  ])("fails closed for unsupported or ambiguous registration syntax: %j", middle => {
    const source = `Sample::Sample() {}\n${middle}void Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("preserves a metadata frame after a registration instead of moving only its closing line", () => {
    const source = `Sample::Sample() {}\n${registration}//----------\n// Copyright Example\n//----------\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("preserves an opening separator before a registration whose matching frame ends after it", () => {
    const source = `Sample::Sample() {}\n//----------\n${registration}// Zeta explanation.\n//----------\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("keeps legacy preamble-only registration output even when the registered class is different", () => {
    const prefix = '#include "Sample.h"\n#include "TIE_Example.h"\nTIE_Example(Other);\n';
    const source = `${prefix}Sample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(prefix)).toBe(true);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
  });

  it("does not hide a split return type in the preamble before the first method", () => {
    const source = `void\n${registration}Sample::zeta() {}\nSample::Sample() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("does not hide a conditional opener in the preamble", () => {
    const source = `#if FEATURE\nSample::Sample() {}\n${registration}#endif\nvoid Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("never treats strings or block comments containing fake registrations as barriers", () => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() { const char* raw = R"tag(\n${registration})tag"; }\n/*\n${registration}*/\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(result.text).toContain(`R"tag(\n${registration})tag"`);
    expect(result.text).toContain(`/*\n${registration}*/`);
  });

  it("preserves mixed line endings instead of normalizing a registration", () => {
    const source = `Sample::Sample() {}\n${registration.replace(/\n/g, '\r\n')}void Sample::zeta() {}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("mixed line endings");
  });
});


describe("conditionals wholly inside member bodies", () => {
  it.each(["\n", "\r\n", "\r"])("moves complete version branches with their owning methods (%j)", eol => {
    const zeta = 'void Sample::zeta() {\n#ifdef VERSION_A\n    work();\n#else // legacy implementation\n    fallback();\n#endif\n}\n';
    const alpha = 'void Sample::alpha() {\n#ifndef VERSION_B\n    first();\n#else\n    second();\n#endif\n}\n';
    const source = (`#include "Sample.h"\nSample::Sample() {}\nSample::~Sample() {}\n${zeta}${alpha}`).replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(zeta.replace(/\n/g, eol));
    expect(result.text).toContain(alpha.replace(/\n/g, eol));
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample")).toEqual({ text: result.text, changed: false, className: "Sample" });
  });

  it.each(["0", "1", "defined VERSION_A", "defined(VERSION_A)", "defined ( VERSION_A )"])("accepts a narrow position-independent #if/#elif expression: %s", expression => {
    const body = `void Sample::zeta() {\n#if ${expression}\n  if (ready()) { work(values[0]); }\n#elif defined VERSION_B\n  fallback();\n#else\n  reset();\n#endif\n}\n`;
    const result = pnwReorderCppText(`Sample::Sample() {}\n${body}void Sample::alpha() {}\n`, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(body);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
  });

  it("preserves nested and consecutive groups, literals and a split return signature", () => {
    const body = 'const Result&\nSample::zeta() {\n#ifdef VERSION_A\n#if defined(DETAIL)\n  work("} ) ] #endif");\n#else\n  fallback();\n#endif\n#endif\n#if 0\n  const char* text = R"raw(\n#ifdef FAKE\n} ] )\n#endif\n)raw";\n#else\n  reset();\n#endif\n  return result_;\n}\n';
    const source = `Sample::Sample() {}\n${body}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(body);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("allows a group inside an existing local scope only when each branch stays inside it", () => {
    const body = 'void Sample::zeta() {\n  if (ready()) {\n#ifdef VERSION_A\n    work();\n#else\n    fallback();\n#endif\n  }\n}\n';
    const result = pnwReorderCppText(`Sample::Sample() {}\n${body}void Sample::alpha() {}\n`, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(body);
  });

  it.each([
    '#ifdef VERSION_A\n  work();\n',
    '#else\n  work();\n#endif\n',
    '#ifdef VERSION_A\n  work();\n#else\n  reset();\n#else\n  fallback();\n#endif\n',
    '#ifdef VERSION_A\n  work();\n#else\n  reset();\n#elif 1\n  fallback();\n#endif\n',
    '#ifdef VERSION_A EXTRA\n  work();\n#endif\n',
    '#if VERSION_A > 2\n  work();\n#endif\n',
    '#if __LINE__ > 1\n  work();\n#endif\n',
    '#if __COUNTER__\n  work();\n#endif\n',
    '#if\n  work();\n#endif\n',
    '#if 1\n  work();\n#else extra\n  reset();\n#endif\n',
    '#if 1\n  work();\n#endif extra\n',
    '#if 1\n#define STATE 1\n  work();\n#endif\n',
    '#if 1\n#undef STATE\n  work();\n#endif\n',
    '#if 1\n#include "Details.h"\n  work();\n#endif\n',
    '#if 1\n#pragma warning(push)\n  work();\n#endif\n',
    '#if 1\n#line 100\n  work();\n#endif\n',
    '#if 1\n#error Unsupported\n#endif\n',
    '#ifdef VERSION_A\n  if (ready()) {\n#else\n  if (other()) {\n#endif\n  }\n',
    '  if (ready()) {\n#ifdef VERSION_A\n  }\n  {\n#else\n  work();\n#endif\n  }\n',
    '#ifdef VERSION_A\n  call(\n#else\n  call(\n#endif\n  );\n',
    '#ifdef VERSION_A\n  values[\n#else\n  values[\n#endif\n  0];\n',
    '#ifdef VERSION_A\n  call([)];\n#else\n  reset();\n#endif\n',
    ['#if defined VERSION_A \\', '  work();', '#endif', ''].join('\n'),
    ['// Continued comment \\', '#ifdef VERSION_A', '  work();', '#endif', ''].join('\n'),
    ['#ifdef VERSION_A', '  work(); \\', '#else', '  reset();', '#endif', ''].join('\n'),
  ])("rejects malformed, state-changing or structurally crossing groups: %j", inner => {
    const source = `Sample::Sample() {}\nvoid Sample::zeta() {\n${inner}}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.join()).toContain("preprocessor");
  });

  it.each([
    '#ifdef VERSION_A\nvoid Sample::zeta() {}\n#else\nvoid Sample::beta() {}\n#endif\n',
    'void Sample::zeta() {\n#ifdef VERSION_A\n  work();\n}\n#endif\n',
    '#ifdef VERSION_A\nvoid Sample::zeta() {\n  work();\n#endif\n}\n',
    'void\n#ifdef VERSION_A\nSample::zeta() { work(); }\n#endif\n',
    'Sample::Sample(int value)\n#ifdef VERSION_A\n : value_(value)\n#else\n : value_(0)\n#endif\n {}\n',
  ])("does not permit conditional boundaries around signatures or across methods: %j", middle => {
    const source = `Sample::Sample() {}\n${middle}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("does not hide an unclosed enclosing preamble conditional behind a locally complete group", () => {
    const source = '#ifdef OUTER\nSample::Sample() {}\nvoid Sample::zeta() {\n#ifdef INNER\n  work();\n#endif\n}\nvoid Sample::alpha() {}\n';
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("preprocessor");
  });

  it("preserves mixed line endings in a conditional body", () => {
    const source = 'Sample::Sample() {}\nvoid Sample::zeta() {\n#ifdef VERSION_A\r\n  work();\r#endif\n}\nvoid Sample::alpha() {}\n';
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.join()).toContain("mixed line endings");
  });

  it("sorts verified conditional bodies on the outside of a TIE registration", () => {
    const registration = '#include "TIE_Example.h"\nTIE_Example(Sample);\n';
    const body = 'void Sample::zeta() {\n#ifdef VERSION_A\n  work();\n#else\n  fallback();\n#endif\n}\n';
    const source = `Sample::Sample() {}\n${registration}${body}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(registration);
    expect(result.text).toContain(body);
    expect(result.text.indexOf("TIE_Example(Sample)")).toBeLessThan(result.text.indexOf("Sample::alpha"));
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::zeta"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });
});


describe("TIE registrations with verified body conditions", () => {
  const registration = '#include "TIE_Example.h"\nTIE_Example(Sample);\n';
  const preamble = '#if defined VERSION_A\n#include "Modern.h"\n#else\n#include "Legacy.h"\n#endif\n';
  const factory = 'void Sample::create() {\n#if defined VERSION_A\n  work();\n#else\n  fallback();\n#endif\n#if 0\n// START KEVIN CAA WIZARD SECTION Sample BODY\n// clang-format off\n  generated();\n// clang-format on\n// END KEVIN CAA WIZARD SECTION Sample BODY\n#else\n  manual();\n#endif\n}\n';

  it.each(["\n", "\r\n", "\r"])("keeps an already sorted mixed file and complete inner locks byte-for-byte (%j)", eol => {
    const source = `${preamble}Sample::Sample() {}\n\nSample::~Sample() {}\n\n${registration}\n${factory}`.replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result).toEqual({ text: source, changed: false, className: "Sample" });
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
  });

  it("supports a strictly verified registration manually placed before the constructor", () => {
    const prefix = preamble + registration;
    const source = `${prefix}Sample::Sample() {}\n${factory}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(prefix)).toBe(true);
    expect(result.text).toContain(factory);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::create"));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("does not use the legacy preamble exemption to skip registration checks when body conditions are present", () => {
    const source = `${preamble}${registration.replace('TIE_Example(Sample)', 'TIE_Example(Other)')}Sample::Sample() {}\n${factory}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("preserves the include-only preamble while reordering complete functions after registration", () => {
    const source = `${preamble}Sample::Sample() {}\n${registration}${factory}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(preamble)).toBe(true);
    expect(result.text).toContain(factory);
    expect(result.text.indexOf("Sample::alpha")).toBeLessThan(result.text.indexOf("Sample::create"));
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it.each([
    '#if defined VERSION_A\n#define FLAG 1\n#endif\n',
    '#if defined VERSION_A\n#undef FLAG\n#endif\n',
    '#if defined VERSION_A\nint value;\n#endif\n',
    '#if defined VERSION_A\nREGISTER_GLOBAL(Sample);\n#endif\n',
    '#if defined VERSION_A\n#pragma warning(push)\n#endif\n',
    '#if VERSION_A > 10\n#include "Modern.h"\n#endif\n',
    '#if 1\n#include "Modern.h"\n#else\n#include "Legacy.h"\n#else\n#endif\n',
    '#if 1\n#include "Modern.h"\n#else\n#include "Legacy.h"\n#elif 0\n#endif\n',
    '#if 1\n#include "Modern.h"\n',
    ['#if 1', '// Continued comment \\', '#include "Modern.h"', '#endif', ''].join('\n'),
    ['#if defined VERSION_A \\', '#include "Modern.h"', '#endif', ''].join('\n'),
    ['#if 1', '#include "Modern.h" \\', '#endif', ''].join('\n'),
  ])("does not extend the exemption to arbitrary preamble condition content: %j", head => {
    const source = `${head}Sample::Sample() {}\n${registration}${factory}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it.each([
    '#ifdef VERSION_A\n#define FLAG 1\n#endif\n',
    '#ifdef VERSION_A\n#undef FLAG\n#endif\n',
    '#ifdef VERSION_A\n#include "Local.h"\n#endif\n',
    '#ifdef VERSION_A\n  if (ready()) {\n#else\n  if (other()) {\n#endif\n  }\n',
  ])("does not let registration support bypass unsafe body directives: %j", inner => {
    const source = `${preamble}Sample::Sample() {}\n${registration}void Sample::zeta() {\n${inner}}\nvoid Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("still blocks a registration located inside a file-level condition", () => {
    const source = `Sample::Sample() {}\n#ifdef VERSION_A\n${registration}#endif\n${factory}void Sample::alpha() {}\n`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });
});


describe("disjoint TIE and pragma ordering barriers", () => {
  const registration = '#include "TIE_Example.h" // Registration include\nTIE_Example(Sample);\n';
  const region = '#pragma region Fixed\n// Fixed implementation order.\nvoid Sample::lockedZeta() {}\nvoid Sample::lockedAlpha() {}\n#pragma endregion\n';
  const method = (name: string) => `void Sample::${name}() {}\n`;

  it.each(["\n", "\r\n", "\r"])("sorts each outside interval independently and preserves raw barriers (%j)", eol => {
    const source = `Sample::Sample() {}\n${method('zetaBefore')}${method('alphaBefore')}${registration}${method('zetaMiddle')}${method('alphaMiddle')}${region}${method('zetaAfter')}${method('alphaAfter')}`.replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.changed).toBe(true);
    expect(result.text).toContain(registration.replace(/\n/g, eol));
    expect(result.text).toContain(region.replace(/\n/g, eol));
    for (const suffix of ['Before', 'Middle', 'After']) {
      expect(result.text.indexOf(`Sample::alpha${suffix}`)).toBeLessThan(result.text.indexOf(`Sample::zeta${suffix}`));
    }
    expect(result.text.indexOf('Sample::zetaBefore')).toBeLessThan(result.text.indexOf('TIE_Example(Sample)'));
    expect(result.text.indexOf('TIE_Example(Sample)')).toBeLessThan(result.text.indexOf('Sample::alphaMiddle'));
    expect(result.text.indexOf('Sample::zetaMiddle')).toBeLessThan(result.text.indexOf('#pragma region'));
    expect(result.text.indexOf('#pragma endregion')).toBeLessThan(result.text.indexOf('Sample::alphaAfter'));
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(source));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it.each(["\n", "\r\n", "\r"])("keeps sorted runs, registration notes and adjacent complete locks byte-for-byte (%j)", eol => {
    const locks = '// DO NOT EDIT THE CODE WITHIN THESE TAGS\n// START KEVIN CAA WIZARD SECTION Sample FIRST\n// clang-format off\n\nvoid Sample::alpha() {}\n\n// clang-format on\n// END KEVIN CAA WIZARD SECTION Sample FIRST\n\n// START KEVIN CAA WIZARD SECTION Sample SECOND\n// clang-format off\n\nvoid Sample::zeta() {}\n\n// clang-format on\n// END KEVIN CAA WIZARD SECTION Sample SECOND\n';
    const source = `Sample::Sample() {}\n\nSample::~Sample() {}\n\n// Registration explanation\n// ----------------\n\n${registration}\n// Registration notes stay in this interval.\n// More notes.\n\n${region}\n${locks}`.replace(/\n/g, eol);
    const result = pnwReorderCppText(source, "Sample");
    expect(result).toEqual({ text: source, changed: false, className: 'Sample' });
  });

  it("supports a preamble pair and a constructor inside the fixed region without moving either", () => {
    const fixed = '#pragma region Fixed\nSample::Sample() {}\nvoid Sample::lockedZeta() {}\n#pragma endregion\n';
    const source = `${registration}${fixed}\n${method('zeta')}${method('alpha')}`;
    const result = pnwReorderCppText(source, "Sample");
    expect(result.warnings).toBeUndefined();
    expect(result.text.startsWith(registration + fixed)).toBe(true);
    expect(result.text.indexOf('Sample::alpha')).toBeLessThan(result.text.indexOf('Sample::zeta'));
    expect(pnwReorderCppText(result.text, "Sample").text).toBe(result.text);
  });

  it("supports the reverse barrier order and multiple strictly disjoint pairs", () => {
    const second = '#include "TIE_Second.h"\nTIE_Second(Sample);\n';
    const source = `Sample::Sample() {}\n${region}${method('zeta')}${method('alpha')}${registration}${method('zulu')}${method('beta')}${second}`;
    const result = pnwReorderCppText(source, 'Sample');
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(region);
    expect(result.text).toContain(registration);
    expect(result.text.endsWith(second)).toBe(true);
    expect(result.text.indexOf('Sample::alpha')).toBeLessThan(result.text.indexOf('Sample::zeta'));
    expect(result.text.indexOf('Sample::beta')).toBeLessThan(result.text.indexOf('Sample::zulu'));
    expect(pnwReorderCppText(result.text, 'Sample').text).toBe(result.text);
  });

  it("anchors ambiguous plain comments after registration while sorting later complete methods", () => {
    const anchor = '\n// Detached explanation.\nvoid Sample::zeta() {}\n';
    const source = `Sample::Sample() {}\n${region}${registration}${anchor}${method('gamma')}${method('beta')}`;
    const result = pnwReorderCppText(source, 'Sample');
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(registration + anchor);
    expect(result.text.indexOf('Sample::beta')).toBeLessThan(result.text.indexOf('Sample::gamma'));
    expect(result.text.indexOf('Sample::zeta')).toBeLessThan(result.text.indexOf('Sample::beta'));
    expect(pnwReorderCppText(result.text, 'Sample').text).toBe(result.text);
  });

  it("moves complete independent banners and split return signatures only inside their interval", () => {
    const documented = '//-----------------\n// Zeta method.\n//--------------------------------\nconst Result&\nSample::zeta() { return result_; }\n';
    const source = `Sample::Sample() {}\n${registration}${region}${documented}${method('alpha')}`;
    const result = pnwReorderCppText(source, 'Sample');
    expect(result.warnings).toBeUndefined();
    expect(result.text).toContain(documented);
    expect(result.text.indexOf('Sample::alpha')).toBeLessThan(result.text.indexOf('Sample::zeta'));
    expect(pnwReorderCppText(result.text, 'Sample').text).toBe(result.text);
  });

  it.each([
    `#pragma region Fixed\n${registration}#pragma endregion\n`,
    '#pragma region Fixed\n#include "TIE_Example.h"\n#pragma endregion\nTIE_Example(Sample);\n',
    '#include "TIE_Example.h"\n#pragma region Fixed\nTIE_Example(Sample);\n#pragma endregion\n',
    `${registration}#pragma region Fixed\nREGISTER_GLOBAL(Sample);\n#pragma endregion\n`,
    `${registration}#pragma region Fixed\n#if 1\n${method('zeta')}#endif\n#pragma endregion\n`,
    `${registration}#pragma region Fixed\n#pragma warning(push)\n#pragma endregion\n`,
    `${registration.replace('TIE_Example(Sample)', 'TIE_Example(Other)')}${region}`,
    `${registration.replace('TIE_Example(Sample)', 'TIE_Other(Sample)')}${region}`,
    `void\n${registration}${method('zeta').replace('void ', '')}${region}`,
    `//----------\n${registration}// Method explanation.\n//------------------\n${method('zeta')}${region}`,
    `//----------\n// Method explanation.\n${registration}//------------------\n${method('zeta')}${region}`,
    `${registration}//----------\n// Copyright Example\n//------------------\n${method('zeta')}${region}`,
    `${registration}//----------\n// @file Example\n//------------------\n${method('zeta')}${region}`,
    `${registration}#pragma region Fixed\n#pragma endregion\n//----------\n// SPDX-FileCopyrightText: Example\n//------------------\n${method('zeta')}`,
    `${registration}#pragma region Fixed\nvoid Sample::inner() {\n#if 1\n  work();\n#endif\n}\n#pragma endregion\n`,
  ])("preserves unsupported overlaps, extra directives and split documentation: %j", middle => {
    const source = `Sample::Sample() {}\n${middle}${method('alpha')}`;
    const result = pnwReorderCppText(source, 'Sample');
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("does not hide a file-level condition surrounding both barrier kinds in the preamble", () => {
    const source = `#if 1\n${registration}Sample::Sample() {}\n${region}${method('alpha')}#endif\n`;
    const result = pnwReorderCppText(source, 'Sample');
    expect(result.text).toBe(source);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });
});


describe("fully locked runs outside disjoint TIE and pragma barriers", () => {
  const prefix = 'Sample::Sample() {}\n#include "TIE_Example.h"\nTIE_Example(Sample);\n#pragma region Fixed\nvoid Sample::fixed() {}\n#pragma endregion\n';
  const locked = (body: string, name = 'METHODS') => `// START KEVIN CAA WIZARD SECTION Sample ${name}\n// clang-format off\n${body}// clang-format on\n// END KEVIN CAA WIZARD SECTION Sample ${name}\n`;

  it.each(["\n", "\r\n", "\r"])("preserves inverse business order inside two complete locks without rebuilding (%j)", eol => {
    const source = (prefix + '\n// Locked methods keep their existing business order.\n'
      + locked('void Sample::zeta() {}\nvoid Sample::alpha() {}\n', 'FIRST')
      + '\n// Separate generated section.\n\n'
      + locked('void Sample::zulu() {}\nvoid Sample::beta() {}\n', 'SECOND')).replace(/\n/g, eol);
    expect(pnwReorderCppText(source, 'Sample')).toEqual({ text: source, className: 'Sample', changed: false });
  });

  it.each([
    'void Sample::zeta(\n// clang-format off\nint value) {}\n// clang-format on\n',
    '// clang-format off\nvoid Sample::zeta() {\n// clang-format on\n  work();\n}\n',
    `${locked('void Sample::zeta() {}\nvoid Sample::beta() {}\n')}void Sample::alpha() {}\n`,
    `void\n${locked('Sample::zeta() {}\nvoid Sample::alpha() {}\n')}`,
    `void Sample::zeta() {\n${locked('  work();\n}\nvoid Sample::alpha() {}\n')}`,
    `${locked('void Sample::zeta() {\n')}  work();\n}\nvoid Sample::alpha() {}\n`,
    locked('void Sample::zeta() {}\nint globalValue = 0;\nvoid Sample::alpha() {}\n'),
    `${locked('void Sample::zeta() {}\nvoid Sample::alpha() {}\n')}UNKNOWN(Sample);\n`,
    `${locked('void Sample::zeta() {}\nvoid Sample::alpha() {}\n')}int globalValue = 0;\n`,
    `${locked('void Sample::zeta() {}\nvoid Sample::alpha() {}\n')}void helper() {}\n`,
    locked('void Sample::zeta() {}\n#define FLAG 1\nvoid Sample::alpha() {}\n'),
  ])("does not exempt partial locks or non-member contents from the normal guards: %j", tail => {
    const source = prefix + tail;
    const result = pnwReorderCppText(source, 'Sample');
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });
});
