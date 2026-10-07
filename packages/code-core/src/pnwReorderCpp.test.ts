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
    '#include "TIE_Example.h"\nTIE_Example(Sample);',
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
