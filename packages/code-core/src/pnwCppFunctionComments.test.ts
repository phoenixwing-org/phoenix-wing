import { describe, expect, it } from "vitest";
import { pnwAddMissingFunctionComment } from "./pnwCppFunctionComments.js";
import { pnwReorderHeaderText } from "./pnwReorderHeader.js";

describe("empty function documentation", () => {
  it.each([
    ["void update(bool busy);", "update", ["busy"], false],
    ["int size() const;", "size", [], true],
    ["bool operator==(const PnwSample& other) const;", "operator==", ["other"], true],
    ["void accept(const Item, ns::Item, int, const Item& named);", "accept", ["named"], false],
    ["void visit(void (*handler)(int), int values[4]);", "visit", ["handler", "values"], false],
    ["void visit(std::pair<int, int> value, int count = factory(1, 2));", "visit", ["value", "count"], false],
    ["void visit(bool first = 1 < 2, bool second = false);", "visit", ["first", "second"], false],
    ["auto update(int value) const noexcept -> void;", "update", ["value"], false],
    ["void PnwSample::update(bool busy) {}", "update", ["busy"], false],
    ["decltype(sizeof(int)) f(int value);", "f", ["value"], true],
    ["decltype(other_f()) f(int value);", "f", ["value"], true],
  ] as const)("documents %s without inventing descriptions", (input, name, params, returns) => {
    const output = pnwAddMissingFunctionComment(input, name, "PnwSample");
    expect(output).toContain(" * @brief\n");
    expect([...output.matchAll(/@param (\w+)/g)].map(match => match[1])).toEqual(params);
    expect(output.includes("@return")).toBe(returns);
    expect(output.endsWith(input)).toBe(true);
    expect(pnwAddMissingFunctionComment(output, name, "PnwSample")).toBe(output);
  });

  it.each([
    ["PnwSample();", "PnwSample"],
    ["explicit PnwSample(int count) {}", "PnwSample"],
    ["PnwSample(const PnwSample& other);", "PnwSample"],
    ["PnwSample(PnwSample&& other) noexcept = default;", "PnwSample"],
    ["virtual ~PnwSample();", "~PnwSample"],
    ["~PnwSample() = default;", "~PnwSample"],
    ["PnwSample& operator=(const PnwSample& other);", "operator="],
    ["PnwSample& operator = (PnwSample&& other) noexcept = delete;", "operator ="],
    ["PnwSample& operator=(int value) { return *this; }", "operator="],
    ["/** @brief Existing assignment */\nPnwSample& operator=(const PnwSample&);", "operator="],
  ])("keeps constructors, destructors and assignments untouched: %s", (input, name) => {
    expect(pnwAddMissingFunctionComment(input, name, "PnwSample")).toBe(input);
  });

  it.each(["\n", "\r\n", "\r"])("documents ordinary header methods without adding lifecycle or assignment comments (%j)", eol => {
    const input = [
      "class PnwSample {", "public:",
      "    /** @brief Standard constructors and destructors */", "    PnwSample();",
      "    virtual ~PnwSample();", "private:",
      "    /** @brief Copy constructor and equal operator */", "    PnwSample(const PnwSample&);",
      "    PnwSample& operator=(const PnwSample&);",
      "    PnwSample& operator = (PnwSample&&) noexcept;",
      "    void update(bool busy);", "};", "",
    ].join(eol);
    const result = pnwReorderHeaderText(input, { addMissingFunctionComments: true });
    expect(result.warnings).toEqual([]);
    expect(result.text.match(/@brief/g)).toHaveLength(3);
    expect(result.text).toContain(`/** @brief Standard constructors and destructors */${eol}    PnwSample();`);
    expect(result.text).toContain(`/** @brief Copy constructor and equal operator */${eol}    PnwSample(const PnwSample&);`);
    expect(result.text).toContain(` * @param busy${eol}`);
    expect(result.text).not.toContain("@return");
    expect(result.text.replace(/\r\n|\r/g, "\n").replace(/\n/g, eol)).toBe(result.text);
    expect(pnwReorderHeaderText(result.text, { addMissingFunctionComments: true }).changed).toBe(false);
  });

  it.each(["// retained\n", "/** existing */\n", "/* ordinary */\n"])("keeps an existing function comment: %s", comment => {
    const input = `${comment}void update(bool busy);`;
    expect(pnwAddMissingFunctionComment(input, "update", "PnwSample")).toBe(input);
  });

  it.each(["\n", "\r\n", "\r"])("separates and documents inline header functions, preserving %j", eol => {
    const input = ["class PnwSample {", "public:", "    void zeta(bool busy) { consume(busy); }", "    int alpha() const { return 1; }", "    int first = factory();", "};", ""].join(eol);
    const options = { addMissingFunctionComments: true };
    const result = pnwReorderHeaderText(input, options);
    expect(result.warnings).toEqual([]);
    expect(result.text).toContain(`    int alpha() const { return 1; }${eol}${eol}    /**`);
    expect(result.text).toContain(` * @param busy${eol}`);
    expect(result.text.match(/@brief/g)).toHaveLength(2);
    expect(result.text).toContain("    int first = factory();");
    expect(pnwReorderHeaderText(result.text, options)).toMatchObject({ text: result.text, changed: false });
  });

  it("keeps comment generation opt-in for core callers", () => {
    const input = "class PnwSample {\npublic:\n    void update(bool busy);\n};\n";
    expect(pnwReorderHeaderText(input).text).not.toContain("@brief");
    expect(pnwReorderHeaderText(input, { addMissingFunctionComments: true }).text).toContain("@param busy");
  });

  it("finds the method after a decltype operand when adding header documentation", () => {
    const input = "class PnwSample {\npublic:\n    decltype(sizeof(int)) f(int value);\n};\n";
    const result = pnwReorderHeaderText(input, { addMissingFunctionComments: true });
    expect(result.text).toContain("@param value");
    expect(result.text).toContain("@return");
  });

  it("never documents protected contents", () => {
    const input = "class PnwSample {\npublic:\n    // clang-format off\n    void update(bool busy);\n    // clang-format on\n};\n";
    expect(pnwReorderHeaderText(input, { addMissingFunctionComments: true }).text).toBe(input);
  });
});
