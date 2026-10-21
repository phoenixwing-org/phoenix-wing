import { describe, expect, it } from "vitest";
import { pnwDocumentCppFunctionsText } from "./pnwDocumentCpp.js";
import { pnwReorderCppText } from "./pnwReorderCpp.js";

describe("source function documentation", () => {
  it.each([undefined, ""])("skips lifecycle and assignment definitions without requiring header declarations (%s)", headerText => {
    const unchanged = [
      "PnwSample::PnwSample() {}",
      "PnwSample::PnwSample(const PnwSample& other) {}",
      "PnwSample::PnwSample(PnwSample&& other) noexcept {}",
      "PnwSample::~PnwSample() {}",
      "PnwSample& PnwSample::operator=(const PnwSample& other) { return *this; }",
      "PnwSample& PnwSample::operator = (PnwSample&& other) noexcept { return *this; }",
      "/** Existing documentation. */", "PnwSample& PnwSample::operator=(int value) { return *this; }", "",
    ].join("\n");
    const source = unchanged + "void ordinary(bool busy) {}\n";
    const result = pnwDocumentCppFunctionsText(source, { headerText });
    expect(result.warnings).toEqual([]);
    expect(result.text.startsWith(unchanged)).toBe(true);
    expect(result.text.match(/@brief/g)).toHaveLength(1);
    expect(result.text).toContain("@param busy\n */\nvoid ordinary");
    expect(pnwDocumentCppFunctionsText(result.text, { headerText }).changed).toBe(false);
  });

  it.each([
    ["/* clang-format off */", "/* clang-format on */"],
    ["// clang-format off: preserve source", "// clang-format on: done"],
  ])("honors unsupported valid format protection even when called without the member sorter: %s", (start, end) => {
    const source = `${start}\nvoid first() {}\nvoid second() {}\n${end}\n`;
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings.join()).toContain("unsupported clang-format protection syntax");
  });
  it("documents free and static functions without reordering or modifying their code", () => {
    const source = '#include "Sample.h"\n\nstatic int combine(int left, int right) {\n    return left + right;\n}\n\nvoid reset(bool busy) {\n    apply(busy);\n}\n';
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.warnings).toEqual([]);
    expect(result.changed).toBe(true);
    expect(result.text).toContain('/**\n * @brief\n * @param left\n * @param right\n * @return\n */\nstatic int combine');
    expect(result.text).toContain('/**\n * @brief\n * @param busy\n */\nvoid reset');
    expect(result.text.replace(/\/\*\*\n(?: \*[^\n]*\n)+ \*\/\n/g, "")).toBe(source);
    expect(pnwDocumentCppFunctionsText(result.text)).toEqual({ text: result.text, changed: false, warnings: [] });
  });

  it("walks named, nested and anonymous namespaces but never walks function or class bodies", () => {
    const source = [
      "namespace Detail {", "namespace {", "    int helper(int value) {", "        return value;", "    }", "}",
      "namespace Inner::Leaf {", "void invoke() {", "    helper(1);", "    auto nested = []() { return helper(2); };", "}", "}",
      "class Local {", "    void inline_member() {}", "};", "}", "",
    ].join("\n");
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.match(/@brief/g)).toHaveLength(2);
    expect(result.text).toContain("    /**\n     * @brief\n     * @param value\n     * @return\n     */\n    int helper");
    expect(result.text).toContain("auto nested = []() { return helper(2); };");
    expect(result.text).toContain("    void inline_member() {}");
  });

  it("uses header context to skip existing declarations and document missing qualified definitions", () => {
    const source = "void Sample::declared(int count) {}\nvoid Sample::missing(bool busy) {}\nSample::Sample() {}\nSample::~Sample() {}\n";
    const headerText = "class Sample { public: void declared(int count); Sample(); ~Sample(); };";
    const result = pnwDocumentCppFunctionsText(source, { headerText });
    expect(result.warnings).toEqual([]);
    expect(result.text.match(/@brief/g)).toHaveLength(1);
    expect(result.text).toContain("/**\n * @brief\n * @param busy\n */\nvoid Sample::missing");
    expect(result.text.startsWith("void Sample::declared(int count) {}\n")).toBe(true);
    expect(result.text).not.toContain("@return");
  });

  it("adds missing documentation after sorting even when the sorter inserted decorative separators", () => {
    const source = "Sample::Sample() {}\nvoid Sample::zeta() {}\nvoid Sample::alpha(bool busy) {}\n";
    const headerText = "class Sample { public: Sample(); void zeta(); };";
    const sorted = pnwReorderCppText(source, "Sample");
    expect(sorted.warnings).toBeUndefined();
    const result = pnwDocumentCppFunctionsText(sorted.text, { headerText });
    expect(result.warnings).toEqual([]);
    expect(result.text.match(/@brief/g)).toHaveLength(1);
    expect(result.text).toContain("//----------------------------------------\n/**\n * @brief\n * @param busy\n */\nvoid Sample::alpha");
    expect(result.text.match(/\/\/-{40}\n/g)).toHaveLength(3);
    expect(pnwDocumentCppFunctionsText(result.text, { headerText }).changed).toBe(false);
  });

  it("does not treat a commented header signature as an existing declaration", () => {
    const result = pnwDocumentCppFunctionsText("int Sample::missing() { return 1; }\n", {
      headerText: "// int missing();\nclass Sample {};",
    });
    expect(result.warnings).toEqual([]);
    expect(result.text).toContain("@return");
  });

  it("reports qualified functions with no header context while still recognizing free functions", () => {
    const source = "void Sample::update() {}\nvoid helper() {}\n";
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.warnings.join()).toContain("header context is unavailable");
    expect(result.text.startsWith("void Sample::update() {}\n")).toBe(true);
    expect(result.text).toContain("/**\n * @brief\n */\nvoid helper");
  });

  it.each(["// Existing description.\n", "/* Existing description. */\n", "/**\n * @brief Existing description.\n */\n"])("preserves any existing leading function comment: %s", comment => {
    const source = `${comment}void helper() {}\n`;
    expect(pnwDocumentCppFunctionsText(source)).toEqual({ text: source, changed: false, warnings: [] });
  });

  it("ignores fake signatures and braces inside comments, strings and raw strings", () => {
    const source = [
      'const char* example = R"tag(void fake() { })tag";',
      '// void comment_fake() {}',
      'int values[] = { 1, 2, 3 };',
      'void real_function() {',
      '    const char* text = "} void inner_fake() {";',
      '}', '',
    ].join("\n");
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.match(/@brief/g)).toHaveLength(1);
    expect(result.text).toContain(" */\nvoid real_function");
  });

  it("skips nested conditional regions and documents only independent functions outside them", () => {
    const source = [
      "#include <utility>", "#if FEATURE", "void first() {}", "#ifdef DETAIL", "void second() {}",
      "#elif OTHER", "void third() {}", "#endif", "#else", "void fourth() {}", "#endif", "void outside() {}", "",
    ].join("\n");
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.text.match(/@brief/g)).toHaveLength(1);
    expect(result.text).toContain(" */\nvoid outside");
    expect(result.text.slice(0, result.text.indexOf("/**"))).toBe(source.slice(0, source.indexOf("void outside")));
    expect(result.warnings.join()).toContain("conditional preprocessor region");
  });

  it("does not add a comment to a function whose body contains conditional compilation", () => {
    const source = "void conditional() {\n#if FEATURE\n    work();\n#else\n    fallback();\n#endif\n}\n";
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings.join()).toContain("overlaps protected or preprocessor content");
  });

  it.each([
    ["// clang-format off", "// clang-format on"],
    ["// START KEVIN CAA WIZARD SECTION", "// END KEVIN CAA WIZARD SECTION"],
    ["#pragma region Generated", "#pragma endregion"],
  ])("does not modify protected contents: %s", (start, end) => {
    const locked = `${start}\nvoid locked() {}\n${end}\n`;
    const source = `${locked}void outside() {}\n`;
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.text.startsWith(locked)).toBe(true);
    expect(result.text.match(/@brief/g)).toHaveLength(1);
    expect(result.warnings.join()).toContain("protected region");
  });

  it.each(["#if FEATURE\n", "#else\n", "#endif\n", "// clang-format off\n", "// KEVIN_SYSTEM_CODE START\n"])("leaves all source intact when boundaries are unmatched or unsupported: %s", prefix => {
    const source = `${prefix}void helper() {}\n`;
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it.each([
    "template<class T>\nT helper(T value) { return value; }\n",
    "decltype(value) helper() { return value; }\n",
    "Sample::Sample() : value_(1) {}\n",
    "int helper() requires Ready<int> { return 1; }\n",
    "namespace { int helper() { return 1; } }\n",
    "MAKE_FUNCTION(helper) { return 1; }\n",
  ])("leaves unsupported signature forms unchanged and explains why: %s", source => {
    const result = pnwDocumentCppFunctionsText(source, { headerText: "" });
    expect(result.text).toBe(source);
    expect(result.changed).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it.each(["\n", "\r\n", "\r"])("preserves newline style and is idempotent (%j)", eol => {
    const source = "static int helper(int value) {\n    return value;\n}\n".replace(/\n/g, eol);
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.replace(/\r\n|\r/g, "\n").replace(/\n/g, eol)).toBe(result.text);
    expect(pnwDocumentCppFunctionsText(result.text)).toEqual({ text: result.text, changed: false, warnings: [] });
  });

  it("documents common trailing-return and noexcept signatures", () => {
    const source = "auto first(int value) noexcept -> int { return value; }\nvoid second() noexcept {}\n";
    const result = pnwDocumentCppFunctionsText(source);
    expect(result.warnings).toEqual([]);
    expect(result.text.match(/@brief/g)).toHaveLength(2);
    expect(result.text.match(/@return/g)).toHaveLength(1);
  });
});
