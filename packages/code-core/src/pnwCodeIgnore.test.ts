import { describe, expect, it } from "vitest";
import {
  pnwCodeIsIgnoredName,
  pnwCodeIsIgnoredPath,
  pnwCodeNormalizeIgnorePatterns,
  pnwCodeParseIgnoreText,
  pnwCodeShouldSkipDirName,
} from "./pnwCodeIgnore.js";

describe("Phoenix Code ignore rules", () => {
  it("parses comments and preserves rule order", () => {
    expect(pnwCodeParseIgnoreText("# note\r\n build/ \r\n\r\nlegacy.cpp\n"))
      .toEqual(["build/", "legacy.cpp"]);
  });

  it("can deduplicate with Host-selected case semantics", () => {
    expect(pnwCodeNormalizeIgnorePatterns(
      ["Build", "build", "dist", "dist"],
      { caseSensitive: false, dedupe: true },
    )).toEqual(["Build", "dist"]);
    expect(pnwCodeNormalizeIgnorePatterns(
      ["Build", "build"],
      { caseSensitive: true, dedupe: true },
    )).toEqual(["Build", "build"]);
  });

  it("matches directory, globstar, wildcard and exact-path rules", () => {
    expect(pnwCodeIsIgnoredPath("build/out.cpp", ["build/"])).toBe(true);
    expect(pnwCodeIsIgnoredPath("thirdparty/vendor/lib.cpp", ["**/vendor/**"])).toBe(true);
    expect(pnwCodeIsIgnoredPath("legacy/old.cpp", ["legacy/old.cpp"])).toBe(true);
    expect(pnwCodeIsIgnoredPath("legacy/new.cpp", ["legacy/old.cpp"])).toBe(false);
    expect(pnwCodeIsIgnoredPath("build_test/output.o", ["build_????/"])).toBe(true);
  });

  it("separates case sensitivity from ignore storage", () => {
    expect(pnwCodeIsIgnoredPath("Build/out.cpp", ["build/"], { caseSensitive: true })).toBe(false);
    expect(pnwCodeIsIgnoredPath("Build/out.cpp", ["build/"], { caseSensitive: false })).toBe(true);
  });

  it("supports traversal pruning and an explicit hidden-entry policy", () => {
    expect(pnwCodeShouldSkipDirName("cmake-build-release", ["cmake-build-*/"])).toBe(true);
    expect(pnwCodeShouldSkipDirName("src", ["cmake-build-*/"])).toBe(false);
    expect(pnwCodeIsIgnoredName(".cache", [], { ignoreHidden: true })).toBe(true);
    expect(pnwCodeIsIgnoredName(".cache", [], { ignoreHidden: false })).toBe(false);
  });
});
