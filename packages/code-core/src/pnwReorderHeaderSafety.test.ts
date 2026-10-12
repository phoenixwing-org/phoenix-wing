import { describe, expect, it } from "vitest";
import { pnwExtractLockedRegionContents, pnwReorderHeaderText } from "./pnwReorderHeader.js";

describe("header sorting declaration ownership", () => {
  it("preserves a raw literal containing quote and brace tokens", () => {
    const input = 'class PnwSample {\npublic:\n    void zeta() {}\n    const char* text = R"(payload " } payload)";\n    void alpha();\n};\n';
    const result = pnwReorderHeaderText(input, { addMissingFunctionComments: true });
    expect(result).toMatchObject({ text: input, changed: false });
    expect(result.warnings.join(" ")).toContain("raw string");
  });

  it.each(["// clang-format off", "// START KEVIN CAA WIZARD SECTION Sample", "// CAA2 WIZARD", "// KEVIN_SYSTEM_CODE START", "#pragma region Functions"])("refuses unmatched protection: %s", marker => {
    const input = `class PnwSample {\npublic:\n    ${marker}\n    void zeta();\n    void alpha();\n};\n`;
    const result = pnwReorderHeaderText(input, { addMissingFunctionComments: true });
    expect(result).toMatchObject({ text: input, changed: false });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it.each(["\n", "\r\n"])("preserves nested class methods and access labels with %j", eol => {
    const nested = ["    class PnwNested {", "    public:", "        PnwNested();",
      "        bool inspect() const;", "    private:", "        int value = 0;", "    };"].join(eol);
    const input = ["class PnwSample {", "public:", "    void zeta();", "    void alpha();",
      "private:", nested, "    int count = 0;", "};", ""].join(eol);
    const result = pnwReorderHeaderText(input);
    expect(result.text).toContain(nested);
    expect(result.text.match(/bool inspect\(\) const;/g)).toHaveLength(1);
    expect(result.text.indexOf("void alpha")).toBeLessThan(result.text.indexOf("void zeta"));
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);
  });

  it.each([
    "int first = make_z();\nint second = make_a();",
    "PnwSample first = PnwSample();\nPnwSample second = make_a();",
    "std::string first = std::string(4, 'x');\nstd::string second = make_a();",
    "std::function<void(int)> first;\nstd::function<void()> second = [] { consume(); };",
    "void (*first)(int);\nvoid (*second)(int) = nullptr;",
    "decltype(factory()) first = factory();\ndecltype(factory()) second;",
    "int first[capacity()];\nint second{make_a()};",
    'const char* first = "operator+(int)";\nconst char* second = "operator-(int)";',
    "int first = source.operator()(1);\nint second = source.operator()(first);",
    "decltype(source.operator()()) first;\ndecltype(source.operator()()) second;",
    "long (PnwTarget::*first)() = &PnwTarget::z;\nint (PnwTarget::*second)() = &PnwTarget::a;",
  ])("keeps fields with calls, callable types and direct initializers: %s", fields => {
    const declarations = fields.split("\n").map(line => `    ${line}`).join("\n");
    const input = `class PnwSample {\npublic:\n    void zeta();\n${declarations}\n    void alpha();\n};\n`;
    const result = pnwReorderHeaderText(input);
    expect(result.text).toContain(declarations);
    expect(result.text.indexOf("void alpha")).toBeLessThan(result.text.indexOf("void zeta"));
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);
  });

  it("keeps member-only input byte for byte", () => {
    const input = "class PnwSample {\npublic:\n    int first = z();\n    int second = a();\n};\n";
    expect(pnwReorderHeaderText(input)).toMatchObject({ text: input, changed: false });
  });

  it("does not document initializer operator calls as functions", () => {
    const input = "class PnwSample {\npublic:\n    int first = source.operator()(1);\n    int second = source.operator()(first);\n};\n";
    expect(pnwReorderHeaderText(input, { addMissingFunctionComments: true }).text).toBe(input);
  });

  it("keeps pointer-to-member fields undocumented and in source order", () => {
    const input = "class PnwSample {\npublic:\n    long (PnwTarget::*first)() = &PnwTarget::z;\n    int (PnwTarget::*second)() = &PnwTarget::a;\n};\n";
    expect(pnwReorderHeaderText(input, { addMissingFunctionComments: true }).text).toBe(input);
  });

  it("does not treat a default argument constructor call as the enclosing method", () => {
    const input = "class PnwSample {\npublic:\n    void zeta(PnwSample value = PnwSample());\n    PnwSample();\n    void alpha();\n};\n";
    const result = pnwReorderHeaderText(input, { addMissingFunctionComments: true });
    expect(result.text.indexOf("PnwSample();")).toBeLessThan(result.text.indexOf("void alpha"));
    expect(result.text.indexOf("void alpha")).toBeLessThan(result.text.indexOf("void zeta"));
    expect(result.text).toContain("@param value");
  });

  it("does not move a private field behind a later public field", () => {
    const input = "class PnwSample {\nprivate:\n    int first = make_z();\npublic:\n    int second = first;\n    void zeta();\n    void alpha();\n};\n";
    const result = pnwReorderHeaderText(input);
    expect(result.text.indexOf("int first")).toBeLessThan(result.text.indexOf("int second"));
    expect(result.text.indexOf("void alpha")).toBeLessThan(result.text.indexOf("void zeta"));
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);
  });

  it("does not mistake default arguments or deleted functions for initialized fields", () => {
    const input = "class PnwSample {\npublic:\n    void zeta(int value = factory());\n    PnwSample() = default;\n    void alpha() = delete;\n};\n";
    const result = pnwReorderHeaderText(input);
    expect(result.text.indexOf("PnwSample()")).toBeLessThan(result.text.indexOf("void alpha"));
    expect(result.text.indexOf("void alpha")).toBeLessThan(result.text.indexOf("void zeta"));
  });

  it("keeps paired generated GET/SET sections and formatter markers intact", () => {
    const input = ["class PnwSample {", "public:",
      "// START KEVIN CAA WIZARD SECTION Sample GET", "// clang-format off", "public: // Get",
      "    virtual int get_value() const = 0;", "// clang-format on",
      "// END KEVIN CAA WIZARD SECTION Sample GET",
      "// START KEVIN CAA WIZARD SECTION Sample SET", "// clang-format off", "public: // Set",
      "    virtual void set_value(int value) = 0;", "// clang-format on",
      "// END KEVIN CAA WIZARD SECTION Sample SET", "};", ""].join("\n");
    const result = pnwReorderHeaderText(input);
    expect(result.text).toBe(input);
    expect(pnwExtractLockedRegionContents(result.text)).toEqual(pnwExtractLockedRegionContents(input));
    expect(result.warnings).toEqual([]);
  });

  it("never reorders virtual interface slots or moves methods through them", () => {
    const input = "class PnwInterface {\npublic:\n    void zeta();\n    virtual int get_z() const = 0;\n    void omega();\n    void beta();\n    virtual int get_a() const = 0;\n    void alpha();\n};\n";
    const result = pnwReorderHeaderText(input);
    expect(result.text.indexOf("zeta()")).toBeLessThan(result.text.indexOf("get_z()"));
    expect(result.text.indexOf("get_z()")).toBeLessThan(result.text.indexOf("beta()"));
    expect(result.text.indexOf("beta()")).toBeLessThan(result.text.indexOf("omega()"));
    expect(result.text.indexOf("omega()")).toBeLessThan(result.text.indexOf("get_a()"));
    expect(result.text.indexOf("get_a()")).toBeLessThan(result.text.indexOf("alpha()"));
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);
  });

  it("preserves system-code markers and their contents by default", () => {
    const block = "    // KEVIN_SYSTEM_CODE START\n    void zeta();\n    void alpha();\n    // KEVIN_SYSTEM_CODE END";
    const input = `class PnwSample {\npublic: // KEVIN_SYSTEM_CODE\n${block}\npublic: // functions\n    void other();\n};\n`;
    const result = pnwReorderHeaderText(input);
    expect(result.text).toContain(block);
    expect(pnwReorderHeaderText(result.text).changed).toBe(false);
  });
});
